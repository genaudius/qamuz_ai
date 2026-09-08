import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { aiJobs, music } from '$lib/server/db/schema.js';
import { storageService } from '$lib/server/storage.js';
import { getKieTimestampedLyrics, isKieGenerateOnly } from '$lib/ai/providers/kie-music.js';
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
	source: 'cached' | 'local' | 'kie' | 'stt' | 'structure' | 'instrumental' | 'empty';
	reason?: string;
};

function envFlag(name: string, fallback = false): boolean {
	const raw = process.env[name];
	if (raw == null || raw === '') return fallback;
	return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/** Opt-in: Kie get-timestamped-lyrics costs 0.5 credits per clip. Off by default. */
export function isKieTimestampedLyricsEnabled(): boolean {
	return envFlag('KIE_TIMESTAMPED_LYRICS', false);
}

/** Opt-in: ElevenLabs STT alignment (paid). Off by default. */
export function isSttLyricsAlignEnabled(): boolean {
	return envFlag('LYRICS_ALIGN_STT', false);
}

function toStored(lines: TimedLyricLine[]): AlignedLyricLine[] {
	return lines.map((line) => ({
		text: line.text,
		start: line.start,
		end: line.end,
		section: line.section
	}));
}

function pickProviderAudioId(
	result: Record<string, unknown>,
	musicId: string
): string | undefined {
	const tracks = Array.isArray(result.tracks)
		? (result.tracks as Array<Record<string, unknown>>)
		: [];
	const variants = Array.isArray(result.variants)
		? (result.variants as Array<Record<string, unknown>>)
		: [];
	const musicIds = Array.isArray(result.musicIds)
		? (result.musicIds as unknown[]).filter((id): id is string => typeof id === 'string')
		: [];

	let index = tracks.findIndex((track) => track.musicId === musicId);
	if (index < 0) index = musicIds.indexOf(musicId);
	if (index < 0 && result.musicId === musicId) index = 0;
	if (index < 0) return undefined;

	const track = tracks[index];
	const candidates = [
		track?.providerAudioId,
		track?.audioId,
		variants[index]?.id,
		variants[0]?.id
	];
	for (const value of candidates) {
		if (typeof value === 'string' && value.trim() && value !== musicId) {
			return value.trim();
		}
	}
	return undefined;
}

function idsFromResult(
	result: Record<string, unknown> | null | undefined,
	musicId: string
): { taskId?: string; audioId?: string } {
	if (!result) return {};
	return {
		taskId: typeof result.providerTaskId === 'string' ? result.providerTaskId : undefined,
		audioId: pickProviderAudioId(result, musicId)
	};
}

async function resolveKieSource(musicId: string): Promise<{ taskId?: string; audioId?: string }> {
	try {
		const [primary] = await db
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
		const fromPrimary = idsFromResult(primary?.result as Record<string, unknown> | null, musicId);
		if (fromPrimary.taskId && fromPrimary.audioId) return fromPrimary;

		// Sibling clip: musicId lives in musicIds[] / tracks[], not result.musicId.
		const [sibling] = await db
			.select({ result: aiJobs.result })
			.from(aiJobs)
			.where(
				and(
					eq(aiJobs.type, 'music-generation'),
					eq(aiJobs.status, 'completed'),
					sql`(${aiJobs.result}->'musicIds') @> ${JSON.stringify([musicId])}::jsonb`
				)
			)
			.orderBy(desc(aiJobs.completedAt))
			.limit(1);
		const fromSibling = idsFromResult(sibling?.result as Record<string, unknown> | null, musicId);
		if (fromSibling.taskId && fromSibling.audioId) return fromSibling;

		return fromPrimary.taskId || fromPrimary.audioId ? fromPrimary : fromSibling;
	} catch {
		const jobs = await db
			.select({ result: aiJobs.result })
			.from(aiJobs)
			.where(and(eq(aiJobs.type, 'music-generation'), eq(aiJobs.status, 'completed')))
			.orderBy(desc(aiJobs.completedAt))
			.limit(100);
		const source = jobs
			.map((item) => item.result as Record<string, unknown> | null)
			.find((result) => {
				if (!result) return false;
				if (result.musicId === musicId) return true;
				const ids = Array.isArray(result.musicIds) ? result.musicIds : [];
				return ids.includes(musicId);
			});
		return idsFromResult(source, musicId);
	}
}

async function alignViaKie(
	musicId: string,
	hints?: { taskId?: string; audioId?: string }
): Promise<TimedLyricLine[] | null> {
	const resolved = await resolveKieSource(musicId);
	const taskId = hints?.taskId || resolved.taskId;
	const audioId = hints?.audioId || resolved.audioId;
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
 * Provider-agnostic karaoke alignment.
 * Cascade (default): cache → local charsiu-js (free) → structure.
 * Paid paths are opt-in via env:
 *   KIE_TIMESTAMPED_LYRICS=1  → 0.5 Kie credits / clip
 *   LYRICS_ALIGN_STT=1        → ElevenLabs STT
 */
export async function alignMusicLyrics(
	musicId: string,
	options: {
		forceRefresh?: boolean;
		taskId?: string;
		audioId?: string;
		allowPaidProviders?: boolean;
	} = {}
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

	const allowPaid = options.allowPaidProviders === true;

	// 1) GenAudius worker (RunPod/Modal) — preferred; skip when worker is down
	try {
		if (record.cloudPath && record.lyrics?.trim()) {
			const { genAudiusClient } = await import('$lib/ai/providers/genaudius-client.js');
			const health = await genAudiusClient.isReady().catch(() => ({ ready: false }));
			if (health.ready) {
				const buffer = await storageService.download(record.cloudPath);
				const remote = await genAudiusClient.alignLyrics({
					audioBase64: buffer.toString('base64'),
					lyrics: record.lyrics,
					mimeType: record.mimeType || 'audio/mpeg'
				});
				if (remote.lines?.length) {
					const lines = toStored(
						remote.lines.map((line) => ({
							text: line.text,
							start: line.start,
							end: line.end,
							timed: remote.source !== 'structure'
						}))
					);
					if (remote.source !== 'structure') {
						await db.update(music).set({ alignedLyrics: lines }).where(eq(music.id, musicId));
					}
					return {
						lines,
						source: remote.source === 'structure' ? 'structure' : 'local',
						reason: remote.source === 'structure' ? 'heuristic_only' : `genaudius:${remote.source}`
					};
				}
			}
		}
	} catch (err) {
		console.warn(`[align-lyrics] GenAudius worker failed for ${musicId}:`, err);
	}

	// 2) Optional local charsiu (OFF by default — OOM on full tracks in Node)
	try {
		const { alignLyricsWithLocalForcedAlign, isLocalForcedAlignEnabled } = await import(
			'$lib/server/music/local-forced-align.js'
		);
		if (isLocalForcedAlignEnabled() && record.cloudPath && record.lyrics?.trim()) {
			const buffer = await storageService.download(record.cloudPath);
			const localLines = await alignLyricsWithLocalForcedAlign({
				buffer,
				mimeType: record.mimeType || 'audio/mpeg',
				lyrics: record.lyrics
			});
			if (localLines?.length) {
				const lines = toStored(localLines);
				await db.update(music).set({ alignedLyrics: lines }).where(eq(music.id, musicId));
				return { lines, source: 'local' };
			}
		}
	} catch (err) {
		console.warn(`[align-lyrics] Local forced-align failed for ${musicId}:`, err);
	}

	// 3) Optional Kie timestamped lyrics — blocked when Kie is generate-only
	if ((allowPaid || isKieTimestampedLyricsEnabled()) && !isKieGenerateOnly()) {
		try {
			const kieLines = await alignViaKie(musicId, {
				taskId: options.taskId,
				audioId: options.audioId
			});
			if (kieLines?.length) {
				const lines = toStored(kieLines);
				await db.update(music).set({ alignedLyrics: lines }).where(eq(music.id, musicId));
				return { lines, source: 'kie' };
			}
		} catch (err) {
			console.warn(`[align-lyrics] Kie path failed for ${musicId}:`, err);
		}
	}

	// 4) Optional ElevenLabs STT map — off unless env or allowPaid
	if (allowPaid || isSttLyricsAlignEnabled()) {
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
	}

	// 5) Structure-aware estimate — never leave UI empty if lyrics exist
	const durationSec =
		Number.isFinite(record.durationMs) && (record.durationMs as number) > 0
			? (record.durationMs as number) / 1000
			: 0;
	const structured = buildStructuredTimedLyrics(record.lyrics || '', durationSec);
	if (structured.length) {
		const lines = toStored(structured);
		return { lines, source: 'structure', reason: 'heuristic_only' };
	}

	return { lines: [], source: 'empty' };
}

/** Prefetch after generate — local/free only (never spend Kie lyrics credits here). */
export async function prefetchAlignedLyrics(
	musicId: string,
	_hints?: { taskId?: string; audioId?: string }
): Promise<void> {
	try {
		await alignMusicLyrics(musicId, {
			forceRefresh: true,
			allowPaidProviders: false
		});
	} catch (err) {
		console.warn(`[align-lyrics] prefetch failed for ${musicId}:`, err);
	}
}
