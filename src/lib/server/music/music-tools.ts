import { and, desc, eq, sql } from 'drizzle-orm';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { db } from '$lib/server/db/index.js';
import { aiJobs, music } from '$lib/server/db/schema.js';
import { storageService } from '$lib/server/storage.js';
import {
	submitKieAddInstrumental,
	submitKieAddVocals,
	submitKieBoostStyle,
	submitKieConvertWav,
	submitKieExtend,
	submitKieGenerateLyrics,
	submitKieGenerateMidi,
	submitKieMashup,
	submitKieReplaceSection,
	submitKieStemSeparation,
	submitKieUploadCover,
	type KieStemMode
} from '$lib/ai/providers/kie-music.js';
import { genAudiusClient } from '$lib/ai/providers/genaudius-client.js';
import { alignMusicLyrics } from '$lib/server/music/align-lyrics.js';

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

export async function resolveKieIds(musicId: string): Promise<{
	taskId?: string;
	audioId?: string;
}> {
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
		return {};
	}
}

export function absoluteMusicUrl(origin: string, musicId: string): string {
	return `${origin.replace(/\/$/, '')}/api/music/${musicId}`;
}

async function convertBufferToWav(input: Buffer, mimeType: string): Promise<Buffer> {
	const dir = await mkdtemp(join(tmpdir(), 'qamuz-wav-'));
	const ext = mimeType.includes('wav') ? 'wav' : mimeType.includes('ogg') ? 'ogg' : 'mp3';
	const inPath = join(dir, `in.${ext}`);
	const outPath = join(dir, 'out.wav');
	try {
		await writeFile(inPath, input);
		await new Promise<void>((resolve, reject) => {
			const child = spawn(
				'ffmpeg',
				['-y', '-i', inPath, '-acodec', 'pcm_s16le', '-ar', '44100', outPath],
				{ stdio: 'ignore' }
			);
			child.on('error', reject);
			child.on('close', (code) => {
				if (code === 0) resolve();
				else reject(new Error(`ffmpeg exited with code ${code}`));
			});
		});
		return await readFile(outPath);
	} finally {
		await rm(dir, { recursive: true, force: true }).catch(() => undefined);
	}
}

async function queueKieJob(
	userId: string,
	type: string,
	payload: Record<string, unknown>,
	providerTaskId: string
) {
	const [job] = await db
		.insert(aiJobs)
		.values({
			userId,
			type,
			status: 'processing',
			payload,
			result: { providerTaskId }
		})
		.returning({ id: aiJobs.id });
	return job.id;
}

/**
 * Unified music-tool runner: GenAudius native where possible, Kie bridge otherwise.
 */
export async function runMusicTool(opts: {
	action: MusicToolAction;
	userId: string;
	origin: string;
	body: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
	const { action, userId, origin, body } = opts;
	const musicId = typeof body.musicId === 'string' ? body.musicId : undefined;
	const uploadUrl =
		typeof body.uploadUrl === 'string'
			? body.uploadUrl
			: musicId
				? absoluteMusicUrl(origin, musicId)
				: undefined;

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
			const result = await alignMusicLyrics(musicId, {
				forceRefresh: body.refresh === true || body.refresh === '1'
			});
			return { source: result.source, ...result };
		}
		case 'boost-style': {
			const content = String(body.content || body.style || '').trim();
			if (!content) throw new Error('style content is required');
			try {
				const boosted = await submitKieBoostStyle(content);
				return { source: 'kie', style: boosted };
			} catch {
				// Local soft boost when Kie unavailable
				return {
					source: 'genaudius',
					style: `${content}, polished production, rich dynamics, modern mix, emotional vocals`
				};
			}
		}
		case 'generate-lyrics': {
			const prompt = String(body.prompt || '').trim();
			if (!prompt) throw new Error('prompt is required');
			const providerTaskId = await submitKieGenerateLyrics({ prompt });
			const jobId = await queueKieJob(userId, 'generate-lyrics', { prompt }, providerTaskId);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'extend': {
			const ids = musicId ? await resolveKieIds(musicId) : {};
			const audioId = typeof body.audioId === 'string' ? body.audioId : ids.audioId;
			if (!audioId) {
				throw new Error(
					'Extend requires a Suno/Kie audioId. Generate with Suno or provide audioId.'
				);
			}
			const providerTaskId = await submitKieExtend({
				audioId,
				prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
				style: typeof body.style === 'string' ? body.style : undefined,
				title: typeof body.title === 'string' ? body.title : undefined,
				continueAt: typeof body.continueAt === 'number' ? body.continueAt : undefined,
				defaultParamFlag: Boolean(body.prompt || body.style || body.title)
			});
			const jobId = await queueKieJob(
				userId,
				'music-extend',
				{ musicId, audioId },
				providerTaskId
			);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'cover': {
			if (!uploadUrl) throw new Error('uploadUrl or musicId is required');
			const providerTaskId = await submitKieUploadCover({
				uploadUrl,
				prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
				style: typeof body.style === 'string' ? body.style : 'modern pop',
				title: typeof body.title === 'string' ? body.title : 'Cover',
				instrumental: Boolean(body.instrumental),
				customMode: true
			});
			const jobId = await queueKieJob(
				userId,
				'music-cover',
				{ musicId, uploadUrl },
				providerTaskId
			);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'add-vocals': {
			if (!uploadUrl) throw new Error('uploadUrl or musicId is required');
			const providerTaskId = await submitKieAddVocals({
				uploadUrl,
				prompt: String(body.prompt || body.lyrics || 'Sing with emotion'),
				title: String(body.title || 'Vocals'),
				style: String(body.style || 'pop'),
				negativeTags: typeof body.negativeTags === 'string' ? body.negativeTags : undefined,
				vocalGender: body.vocalGender === 'f' || body.vocalGender === 'female' ? 'f' : 'm'
			});
			const jobId = await queueKieJob(
				userId,
				'music-add-vocals',
				{ musicId, uploadUrl },
				providerTaskId
			);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'add-instrumental': {
			if (!uploadUrl) throw new Error('uploadUrl or musicId is required');
			const providerTaskId = await submitKieAddInstrumental({
				uploadUrl,
				title: String(body.title || 'Instrumental'),
				tags: String(body.tags || body.style || 'cinematic, atmospheric'),
				negativeTags: typeof body.negativeTags === 'string' ? body.negativeTags : undefined
			});
			const jobId = await queueKieJob(
				userId,
				'music-add-instrumental',
				{ musicId, uploadUrl },
				providerTaskId
			);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'mashup': {
			const urlA =
				typeof body.uploadUrlA === 'string'
					? body.uploadUrlA
					: typeof body.musicIdA === 'string'
						? absoluteMusicUrl(origin, body.musicIdA)
						: undefined;
			const urlB =
				typeof body.uploadUrlB === 'string'
					? body.uploadUrlB
					: typeof body.musicIdB === 'string'
						? absoluteMusicUrl(origin, body.musicIdB)
						: undefined;
			if (!urlA || !urlB) throw new Error('mashup requires two tracks (musicIdA/B or uploadUrlA/B)');
			const providerTaskId = await submitKieMashup({
				uploadUrlList: [urlA, urlB],
				prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
				style: typeof body.style === 'string' ? body.style : 'pop mashup',
				title: typeof body.title === 'string' ? body.title : 'Mashup',
				customMode: true,
				instrumental: Boolean(body.instrumental)
			});
			const jobId = await queueKieJob(
				userId,
				'music-mashup',
				{ urlA, urlB },
				providerTaskId
			);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'replace-section': {
			const ids = musicId ? await resolveKieIds(musicId) : {};
			const taskId = typeof body.taskId === 'string' ? body.taskId : ids.taskId;
			const audioId = typeof body.audioId === 'string' ? body.audioId : ids.audioId;
			if (!taskId || !audioId) {
				throw new Error('replace-section requires Kie taskId + audioId');
			}
			const providerTaskId = await submitKieReplaceSection({
				taskId,
				audioId,
				prompt: String(body.prompt || ''),
				tags: typeof body.tags === 'string' ? body.tags : undefined,
				title: typeof body.title === 'string' ? body.title : undefined,
				infillStartS: Number(body.infillStartS ?? 0),
				infillEndS: Number(body.infillEndS ?? 10)
			});
			const jobId = await queueKieJob(
				userId,
				'music-replace-section',
				{ musicId, taskId, audioId },
				providerTaskId
			);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'stems': {
			const ids = musicId ? await resolveKieIds(musicId) : {};
			const mode = (typeof body.type === 'string' ? body.type : 'split_stem') as KieStemMode;
			const providerTaskId = await submitKieStemSeparation({
				taskId: typeof body.taskId === 'string' ? body.taskId : ids.taskId,
				audioId: typeof body.audioId === 'string' ? body.audioId : ids.audioId,
				audioUrl: uploadUrl,
				type: mode,
				stemName: typeof body.stemName === 'string' ? body.stemName : undefined,
				callBackUrl: 'https://placeholder.internal/qamuz-kie-stems'
			});
			const jobId = await queueKieJob(
				userId,
				'stem-separation',
				{ musicId, mode },
				providerTaskId
			);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'midi': {
			const stemTaskId = typeof body.taskId === 'string' ? body.taskId : undefined;
			if (!stemTaskId) {
				throw new Error('midi requires a completed stem-separation taskId');
			}
			const providerTaskId = await submitKieGenerateMidi({
				taskId: stemTaskId,
				audioId: typeof body.audioId === 'string' ? body.audioId : undefined
			});
			const jobId = await queueKieJob(userId, 'music-midi', { stemTaskId }, providerTaskId);
			return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
		}
		case 'wav': {
			const ids = musicId ? await resolveKieIds(musicId) : {};
			if (ids.taskId && ids.audioId) {
				const providerTaskId = await submitKieConvertWav({
					taskId: ids.taskId,
					audioId: ids.audioId
				});
				const jobId = await queueKieJob(
					userId,
					'music-wav',
					{ musicId },
					providerTaskId
				);
				return { source: 'kie', jobId, taskId: providerTaskId, status: 'processing' };
			}
			// Local ffmpeg path for GenAudius / MusicGPT tracks
			if (!musicId) throw new Error('musicId is required for local WAV convert');
			const [record] = await db
				.select({
					cloudPath: music.cloudPath,
					mimeType: music.mimeType,
					filename: music.filename,
					userId: music.userId
				})
				.from(music)
				.where(and(eq(music.id, musicId), eq(music.userId, userId)))
				.limit(1);
			if (!record?.cloudPath) throw new Error('Track file not found');
			const buffer = await storageService.download(record.cloudPath);
			const wav = await convertBufferToWav(buffer, record.mimeType || 'audio/mpeg');
			const filename = (record.filename || musicId).replace(/\.[^.]+$/, '') + '.wav';
			const uploaded = await storageService.upload(
				{ buffer: wav, mimeType: 'audio/wav', filename },
				userId,
				'audio',
				'generated'
			);
			return {
				source: 'genaudius',
				status: 'completed',
				mimeType: 'audio/wav',
				storagePath: uploaded.path,
				bytes: wav.length
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
