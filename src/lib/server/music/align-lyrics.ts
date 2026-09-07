import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { aiJobs, music } from '$lib/server/db/schema.js';
import { storageService } from '$lib/server/storage.js';
import { getKieTimestampedLyrics } from '$lib/ai/providers/kie-music.js';
import { elevenlabsProvider } from '$lib/ai/index.js';
import {
	alignedWordsToTimedLines,
	buildStructuredTimedLyrics,
	mapSttWordsToLyricLines,
	type TimedLyricLine
} from '$lib/utils/lyrics-sync.js';

export type AlignedLyricLine = {
	text: string;
	start: number;
	end?: number;
	section?: string;
};

export type AlignLyricsResult = {
	lines: AlignedLyricLine[];
	source: 'cached' | 'kie' | 'stt' | 'structure' | 'instrumental' | 'empty';
	reason?: string;
};

function toStored(lines: TimedLyricLine[]): AlignedLyricLine[] {
	return lines.map((line) => ({
		text: line.text,
		start: line.start,
		end: line.end,
		section: line.section
	}));
}

async function resolveKieSource(musicId: string): Promise<{ taskId?: string; audioId?: string }> {
	try {
		const [row] = await db
			.select({ result: aiJobs.result })
			.from(aiJobs)
			.where(
				and(
					eq(aiJobs.type, 'music-generation'),
					eq(aiJobs.status, 'completed'),
					sql`${aiJobs.result}->>'musicId' = ${musicId}`
				)
			)
			.orderBy(desc(aiJobs.completedAt))
			.limit(1);
		const result = row?.result as Record<string, unknown> | null;
		if (!result) return {};
		const variants = Array.isArray(result.variants)
			? (result.variants as Array<Record<string, unknown>>)
			: [];
		return {
			taskId: typeof result.providerTaskId === 'string' ? result.providerTaskId : undefined,
			audioId: typeof variants[0]?.id === 'string' ? variants[0].id : undefined
		};
	} catch {
		const jobs = await db
			.select({ result: aiJobs.result })
			.from(aiJobs)
			.where(and(eq(aiJobs.type, 'music-generation'), eq(aiJobs.status, 'completed')))
			.orderBy(desc(aiJobs.completedAt))
			.limit(100);
		const source = jobs
			.map((item) => item.result as Record<string, unknown> | null)
			.find((result) => result?.musicId === musicId);
		if (!source) return {};
		const variants = Array.isArray(source.variants)
			? (source.variants as Array<Record<string, unknown>>)
			: [];
		return {
			taskId: typeof source.providerTaskId === 'string' ? source.providerTaskId : undefined,
			audioId: typeof variants[0]?.id === 'string' ? variants[0].id : undefined
		};
	}
}

async function alignViaKie(musicId: string): Promise<TimedLyricLine[] | null> {
	const { taskId, audioId } = await resolveKieSource(musicId);
	if (!taskId || !audioId) return null;
	const { alignedWords } = await getKieTimestampedLyrics(taskId, audioId);
	const timed = alignedWordsToTimedLines(alignedWords);
	return timed.length ? timed : null;
}

async function alignViaStt(opts: {
	buffer: Buffer;
	mimeType: string;
	filename: string;
	lyrics: string | null;
}): Promise<TimedLyricLine[] | null> {
	if (!elevenlabsProvider.transcribeAudio) return null;

	const bytes = new Uint8Array(opts.buffer);
	const file = new File([bytes], opts.filename || 'track.mp3', {
		type: opts.mimeType || 'audio/mpeg'
	});

	const response = await elevenlabsProvider.transcribeAudio({
		file,
		modelId: 'scribe_v2',
		tagAudioEvents: true,
		diarize: false
	});

	const words = (response.words || [])
		.filter((w) => w.text?.trim())
		.map((w) => ({
			text: w.text,
			start: w.start,
			end: w.end
		}));

	if (!words.length) return null;

	if (opts.lyrics?.trim()) {
		return mapSttWordsToLyricLines(opts.lyrics, words);
	}
	return mapSttWordsToLyricLines('', words);
}

/**
 * Provider-agnostic karaoke alignment for any GenAudius track.
 * Cascade: cache → Kie (if IDs) → STT forced map → structure heuristic.
 */
export async function alignMusicLyrics(
	musicId: string,
	options: { forceRefresh?: boolean } = {}
): Promise<AlignLyricsResult> {
	const [record] = await db
		.select({
			id: music.id,
			userId: music.userId,
			lyrics: music.lyrics,
			alignedLyrics: music.alignedLyrics,
			isInstrumental: music.isInstrumental,
			durationMs: music.durationMs,
			mimeType: music.mimeType,
			filename: music.filename,
			cloudPath: music.cloudPath
		})
		.from(music)
		.where(eq(music.id, musicId))
		.limit(1);

	if (!record) {
		return { lines: [], source: 'empty', reason: 'not_found' };
	}

	if (record.isInstrumental) {
		return { lines: [], source: 'instrumental' };
	}

	const cached = Array.isArray(record.alignedLyrics) ? record.alignedLyrics : null;
	if (cached && cached.length > 0 && !options.forceRefresh) {
		return { lines: cached, source: 'cached' };
	}

	// 1) Native provider aligner (Suno/Kie) when available
	try {
		const kieLines = await alignViaKie(musicId);
		if (kieLines?.length) {
			const lines = toStored(kieLines);
			await db.update(music).set({ alignedLyrics: lines }).where(eq(music.id, musicId));
			return { lines, source: 'kie' };
		}
	} catch (err) {
		console.warn(`[align-lyrics] Kie path failed for ${musicId}:`, err);
	}

	// 2) Generic STT alignment against the actual audio (works for local/MusicGPT/GenAudius)
	try {
		if (record.cloudPath) {
			const buffer = await storageService.download(record.cloudPath);
			const sttLines = await alignViaStt({
				buffer,
				mimeType: record.mimeType || 'audio/mpeg',
				filename: record.filename || `${musicId}.mp3`,
				lyrics: record.lyrics
			});
			if (sttLines?.length) {
				const lines = toStored(sttLines);
				await db.update(music).set({ alignedLyrics: lines }).where(eq(music.id, musicId));
				return { lines, source: 'stt' };
			}
		}
	} catch (err) {
		console.warn(`[align-lyrics] STT path failed for ${musicId}:`, err);
	}

	// 3) Structure-aware estimate (intro/chorus/outro) — never leave UI empty if lyrics exist
	const durationSec =
		Number.isFinite(record.durationMs) && (record.durationMs as number) > 0
			? (record.durationMs as number) / 1000
			: 0;
	const structured = buildStructuredTimedLyrics(record.lyrics || '', durationSec);
	if (structured.length) {
		const lines = toStored(structured);
		// Do not persist heuristic as "aligned" so a later STT/Kie refresh can upgrade.
		return { lines, source: 'structure', reason: 'heuristic_only' };
	}

	return { lines: [], source: 'empty' };
}

/** Fire-and-forget helper for the generation queue. */
export async function prefetchAlignedLyrics(musicId: string): Promise<void> {
	try {
		await alignMusicLyrics(musicId, { forceRefresh: true });
	} catch (err) {
		console.warn(`[align-lyrics] prefetch failed for ${musicId}:`, err);
	}
}
