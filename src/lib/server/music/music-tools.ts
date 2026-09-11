import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { aiJobs, music } from '$lib/server/db/schema.js';
import { storageService } from '$lib/server/storage.js';
import { genAudiusClient } from '$lib/ai/providers/genaudius-client.js';
import { isKieGenerateOnly } from '$lib/ai/providers/kie-music.js';
import { alignMusicLyrics } from '$lib/server/music/align-lyrics.js';
import {
	boostStyleWithOpenRouter,
	generateLyricsWithOpenRouter
} from '$lib/server/music/openrouter-music-text.js';

export type MusicToolAction =
	| 'extend'
	| 'cover'
	| 'add-vocals'
	| 'add-instrumental'
	| 'mashup'
	| 'replace-section'
	| 'stems'
	| 'midi'
	| 'wav'
	| 'generate-lyrics'
	| 'boost-style'
	| 'align-lyrics'
	| 'catalog'
	| 'voices'
	| 'mixing-tools'
	| 'prompt-preview'
	| 'status';

const SUNO_CONDITIONED: MusicToolAction[] = [
	'extend',
	'cover',
	'add-vocals',
	'add-instrumental',
	'mashup',
	'replace-section'
];

export async function resolveKieIds(musicId: string): Promise<{
	taskId?: string;
	audioId?: string;
}> {
	// Kept for Studio/legacy callers that inspect IDs — not used to spend Kie credits.
	void musicId;
	return {};
}

export function absoluteMusicUrl(origin: string, musicId: string): string {
	return `${origin.replace(/\/$/, '')}/api/music/${musicId}`;
}

async function loadOwnedTrackAudio(musicId: string, userId: string) {
	const [record] = await db
		.select({
			cloudPath: music.cloudPath,
			mimeType: music.mimeType,
			filename: music.filename,
			lyrics: music.lyrics
		})
		.from(music)
		.where(and(eq(music.id, musicId), eq(music.userId, userId)))
		.limit(1);
	if (!record?.cloudPath) throw new Error('Track file not found');
	const buffer = await storageService.download(record.cloudPath);
	return {
		...record,
		audioBase64: buffer.toString('base64'),
		mimeType: record.mimeType || 'audio/mpeg'
	};
}

function blockedSunoTool(action: string): never {
	throw new Error(
		`${action} is a Suno-conditioned Kie tool and is disabled (Kie is generate-only). ` +
			`GenAudius reference-audio conditioning is on the roadmap.`
	);
}

/**
 * Unified music-tool runner.
 * Kie = generate music only. Text tools → OpenRouter. Audio tools → GenAudius workers.
 */
export async function runMusicTool(opts: {
	action: MusicToolAction;
	userId: string;
	origin: string;
	body: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
	const { action, userId, body } = opts;
	const musicId = typeof body.musicId === 'string' ? body.musicId : undefined;

	if (isKieGenerateOnly() && SUNO_CONDITIONED.includes(action)) {
		blockedSunoTool(action);
	}

	switch (action) {
		case 'catalog':
			return { source: 'genaudius', data: await genAudiusClient.musicCatalog() };
		case 'voices':
			return { source: 'genaudius', data: await genAudiusClient.voices() };
		case 'mixing-tools':
			return { source: 'genaudius', data: await genAudiusClient.mixingTools() };
		case 'prompt-preview':
			return {
				source: 'genaudius',
				data: await genAudiusClient.promptPreview(body)
			};
		case 'align-lyrics': {
			if (!musicId) throw new Error('musicId is required');
			const [rec] = await db.select({ userId: music.userId }).from(music).where(eq(music.id, musicId)).limit(1);
			if (rec && rec.userId !== userId) {
				throw new Error('Solo el artista creador puede alinear las letras de esta canción');
			}
			const result = await alignMusicLyrics(musicId, {
				forceRefresh: body.refresh === true || body.refresh === '1',
				allowPaidProviders: false
			});
			return { source: result.source, ...result };
		}
		case 'boost-style': {
			const content = String(body.content || body.style || '').trim();
			if (!content) throw new Error('style content is required');
			try {
				const style = await boostStyleWithOpenRouter(content);
				return { source: 'openrouter', style };
			} catch {
				return {
					source: 'local',
					style: `${content}, polished production, rich dynamics, modern mix, emotional vocals`
				};
			}
		}
		case 'generate-lyrics': {
			const prompt = String(body.prompt || '').trim();
			if (!prompt) throw new Error('prompt is required');
			const lyrics = await generateLyricsWithOpenRouter(prompt);
			return { source: 'openrouter', status: 'completed', lyrics };
		}
		case 'extend':
		case 'cover':
		case 'add-vocals':
		case 'add-instrumental':
		case 'mashup':
		case 'replace-section':
			blockedSunoTool(action);
			break;
		case 'stems': {
			if (!musicId) throw new Error('musicId is required');
			const track = await loadOwnedTrackAudio(musicId, userId);
			const mode =
				typeof body.type === 'string'
					? body.type
					: typeof body.mode === 'string'
						? body.mode
						: 'separate_vocal';
			const result = await genAudiusClient.separateStems({
				audioBase64: track.audioBase64,
				mimeType: track.mimeType,
				mode
			});
			const saved = [];
			for (const stem of result.stems || []) {
				const uploaded = await storageService.upload(
					{
						buffer: Buffer.from(stem.audioBase64, 'base64'),
						mimeType: stem.mimeType || 'audio/wav',
						filename: `${musicId}-${stem.name}.wav`
					},
					userId,
					'audio',
					'generated'
				);
				saved.push({
					name: stem.name,
					storagePath: uploaded.path,
					bytes: stem.bytes,
					mimeType: stem.mimeType
				});
			}
			return { source: 'genaudius', status: 'completed', stems: saved, engine: result.source };
		}
		case 'midi': {
			if (!musicId) throw new Error('musicId is required for GenAudius MIDI');
			const track = await loadOwnedTrackAudio(musicId, userId);
			const result = await genAudiusClient.audioToMidi({
				audioBase64: track.audioBase64,
				mimeType: track.mimeType
			});
			const uploaded = await storageService.upload(
				{
					buffer: Buffer.from(result.audioBase64, 'base64'),
					mimeType: result.mimeType || 'audio/midi',
					filename: result.filename || `${musicId}.mid`
				},
				userId,
				'audio',
				'generated'
			);
			return {
				source: 'genaudius',
				status: 'completed',
				storagePath: uploaded.path,
				mimeType: result.mimeType,
				bytes: result.bytes,
				engine: result.source
			};
		}
		case 'wav': {
			if (!musicId) throw new Error('musicId is required for WAV convert');
			const track = await loadOwnedTrackAudio(musicId, userId);
			const result = await genAudiusClient.convertWav({
				audioBase64: track.audioBase64,
				mimeType: track.mimeType
			});
			const uploaded = await storageService.upload(
				{
					buffer: Buffer.from(result.audioBase64, 'base64'),
					mimeType: 'audio/wav',
					filename: (track.filename || musicId).replace(/\.[^.]+$/, '') + '.wav'
				},
				userId,
				'audio',
				'generated'
			);
			return {
				source: 'genaudius',
				status: 'completed',
				mimeType: 'audio/wav',
				storagePath: uploaded.path,
				bytes: result.bytes
			};
		}
		case 'status': {
			const jobId = typeof body.jobId === 'string' ? body.jobId : undefined;
			if (!jobId) throw new Error('jobId is required');
			const [job] = await db
				.select()
				.from(aiJobs)
				.where(and(eq(aiJobs.id, jobId), eq(aiJobs.userId, userId)))
				.limit(1);
			if (!job) throw new Error('Job not found');
			return {
				source: 'queue',
				jobId: job.id,
				type: job.type,
				status: job.status,
				error: job.errorMessage,
				result: job.result
			};
		}
		default:
			throw new Error(`Unsupported music tool: ${action}`);
	}
}
