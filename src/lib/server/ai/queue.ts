import { db } from '../db/index.js';
import { aiJobs, music, users } from '../db/schema.js';
import { eq, and, asc, isNull, lte, or, sql } from 'drizzle-orm';
import { UsageTrackingService } from '../usage-tracking.js';
import { saveMusicAndGetId } from '$lib/ai/utils.js';
import type { ImageGenerationParams } from '$lib/ai/types.js';
// We'll import provider runners dynamically or define a simple registry

export type JobType = 'music-generation' | 'video-generation' | 'image-generation';

export interface JobPayload {
	prompt?: string;
	model?: string;
	[key: string]: any;
}

function isSunoProviderCreditError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error ?? '');
	const normalized = message.toLowerCase();
	return (
		normalized.includes('suno account credits are insufficient') ||
		normalized.includes('credits insufficient') ||
		normalized.includes('insufficient credits') ||
		normalized.includes('top up the suno api account')
	);
}

function isMusicGptRateLimitError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error ?? '');
	const normalized = message.toLowerCase();
	return (
		normalized.includes('too many parallel requests') ||
		normalized.includes('slow down') ||
		normalized.includes('rate limit')
	);
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

function getThrottleBackoffMs(attempts: number): number {
	const base = Math.max(1, attempts) * 4000;
	return Math.min(45000, base);
}

function extractPromptField(prompt: string, label: string): string | undefined {
	const match = prompt.match(new RegExp(`(?:^|\\n)${label}\\s*:\\s*([^\\n]+)`, 'i'));
	return match?.[1]?.trim() || undefined;
}

function buildMusicCoverPrompt(
	result: any,
	payload: JobPayload,
	options?: { variantIndex?: number; title?: string }
): string {
	const sourcePrompt = String(result.prompt || payload.prompt || '').trim();
	const genre = extractPromptField(sourcePrompt, 'Genre');
	const style = extractPromptField(sourcePrompt, 'Style');
	const title =
		options?.title?.trim() ||
		extractPromptField(sourcePrompt, 'Title') ||
		String(result.title || '').trim();
	const lyrics = String(result.lyrics || extractPromptField(sourcePrompt, 'Lyrics') || '')
		.replace(/\[[^\]]+\]/g, ' ')
		.replace(/\s+/g, ' ')
		.slice(0, 500);
	const vocalMood = payload.forceInstrumental
		? 'instrumental atmosphere'
		: payload.vocalGender === 'duet'
			? 'the emotional connection between two contrasting performers'
			: `${payload.vocalGender || 'female'} vocal energy`;
	const variantIndex = options?.variantIndex ?? 0;
	const variantCue =
		variantIndex === 0
			? 'primary cover, bold focal subject, warm cinematic palette'
			: `alternate cover take ${variantIndex + 1}, different composition and color mood, distinct silhouette from the primary cover`;

	return [
		'Professional square album cover artwork, cinematic and emotionally expressive',
		genre ? `${genre} music visual language` : 'contemporary music visual language',
		style || sourcePrompt,
		title ? `visual concept inspired by the title ${title}` : '',
		lyrics ? `narrative imagery inspired by these lyrical themes: ${lyrics}` : '',
		vocalMood,
		variantCue,
		'strong central composition, memorable silhouette, premium record artwork, dramatic lighting, rich color harmony',
		'no typography, no letters, no words, no logos, no watermark'
	].filter(Boolean).join(', ');
}

async function generateMusicCover(
	result: any,
	job: any,
	options?: { forceNew?: boolean; variantIndex?: number; title?: string }
): Promise<string | undefined> {
	// Reuse an existing unique provider/cover URL only when not forcing a new art piece.
	if (!options?.forceNew && result.imageUrl) return result.imageUrl;

	const { generateLocalImage, isLocalImageReady } = await import('$lib/ai/providers/local-forge.js');
	const status = await isLocalImageReady();
	if (!status.ready) {
		console.warn(
			`[QUEUE] Skipping automatic cover: Forge not reachable at ${status.baseUrl}` +
			`${status.reason ? ` (${status.reason})` : ''}`
		);
		return options?.forceNew ? undefined : result.imageUrl;
	}

	const coverParams: ImageGenerationParams = {
		model: 'qamuz-local-image',
		prompt: buildMusicCoverPrompt(result, job.payload || {}, options),
		size: '1024x1024',
		quality: 'high',
		style: 'album cover, editorial music photography, highly detailed, sharp focus',
		numberOfImages: 1,
		userId: job.userId
	};
	const maxAttempts = 3;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const generated = await generateLocalImage(coverParams, { requireEnabled: false });
			const imageUrl = `/api/images/${generated.imageId}`;
			console.log(`[QUEUE] Cover generated for job ${job.id} variant ${options?.variantIndex ?? 0}: ${imageUrl}`);
			return imageUrl;
		} catch (error) {
			console.warn(`[QUEUE] Cover attempt ${attempt}/${maxAttempts} failed:`, error);
			if (attempt < maxAttempts) {
				await delay(3000 * attempt);
			}
		}
	}
	return options?.forceNew ? undefined : result.imageUrl;
}

export class PriorityQueueService {
	private static isWorkerActive = false;
	private static isProcessScheduled = false;

	private static scheduleProcess(delayMs = 100): void {
		if (PriorityQueueService.isProcessScheduled) {
			return;
		}

		PriorityQueueService.isProcessScheduled = true;
		setTimeout(() => {
			PriorityQueueService.isProcessScheduled = false;
			void PriorityQueueService.processNext();
		}, delayMs);
	}

	/**
	 * Añadir un nuevo trabajo a la cola
	 */
	static async enqueue(userId: string, type: JobType, payload: JobPayload, transactionId: string): Promise<string> {
		const [user] = await db.select({ planTier: users.planTier }).from(users).where(eq(users.id, userId)).limit(1);
		
		// Prioridad: 1 para planes Pro/Advanced, 10 para planes Free/Starter
		const isPremium = user?.planTier === 'pro' || user?.planTier === 'advanced';
		const priority = isPremium ? 1 : 10;

		const [job] = await db.insert(aiJobs).values({
			userId,
			type,
			payload,
			priority,
			transactionId,
			status: 'queued'
		}).returning({ id: aiJobs.id });

		// En un sistema real (y como no usamos Redis), podríamos usar eventos (EventEmitter) o un poll 
		// setTimeout() interno para despertar al Worker. Aquí activaremos el Worker inmediatamente.
		PriorityQueueService.scheduleProcess(100);

		return job.id;
	}

	/**
	 * Worker process: obtiene el trabajo más prioritario y lo ejecuta
	 */
	static async processNext(): Promise<void> {
		if (PriorityQueueService.isWorkerActive) {
			return;
		}

		PriorityQueueService.isWorkerActive = true;

		// PostgreSQL CTE trick to atomically lock and fetch the highest priority job
		// Since Drizzle ORM doesn't natively support UPDATE ... RETURNING with complex subqueries safely for queues,
		// we will fetch, then update, handling potential concurrency via status checks.
		
		try {
			// Find highest priority queued job
			const [nextJob] = await db.select()
				.from(aiJobs)
				.where(eq(aiJobs.status, 'queued'))
				.orderBy(asc(aiJobs.priority), asc(aiJobs.createdAt))
				.limit(1);

			if (!nextJob) return; // No jobs in queue

			// Lock the job
			const [lockedJob] = await db.update(aiJobs)
				.set({ 
					status: 'processing', 
					startedAt: new Date(),
					attempts: nextJob.attempts + 1
				})
				.where(and(
					eq(aiJobs.id, nextJob.id),
					eq(aiJobs.status, 'queued'), // Ensure nobody else took it
					sql`NOT EXISTS (
						SELECT 1
						FROM ai_jobs AS active
						WHERE active.status = 'processing'
						AND active.type = 'music-generation'
					)`
				))
				.returning();

			if (!lockedJob) {
				// Someone else picked it up
				PriorityQueueService.scheduleProcess(50);
				return;
			}

			console.log(`[QUEUE] Processing job ${lockedJob.id} of type ${lockedJob.type}`);
			let nextScheduleDelayMs = 100;

			// Dynamically route job based on type
			try {
				let result: any = {};
				
				if (lockedJob.type === 'music-generation') {
					result = await PriorityQueueService.executeMusicGeneration(lockedJob);

					const variantSources =
						Array.isArray(result.variants) && result.variants.length > 0
							? result.variants
							: [
									{
										audioData: result.audioData,
										mimeType: result.mimeType,
										title: result.title,
										durationMs: result.durationMs,
										imageUrl: result.imageUrl,
										videoUrl: result.videoUrl,
										lyrics: result.lyrics
									}
								];

					const savedTracks = await Promise.all(
						variantSources.map(async (variant: any, index: number) => {
							let audioData = variant.audioData as string | undefined;
							const mimeType = (variant.mimeType as string) || result.mimeType || 'audio/mpeg';
							if (!audioData && typeof variant.audioUrl === 'string') {
								const audioRes = await fetch(variant.audioUrl, {
									signal: AbortSignal.timeout(120_000)
								});
								if (!audioRes.ok) {
									throw new Error(`Failed to download music variant ${index + 1}: ${audioRes.status}`);
								}
								audioData = Buffer.from(await audioRes.arrayBuffer()).toString('base64');
							}
							if (!audioData) {
								throw new Error(`Music variant ${index + 1} has no audio payload`);
							}

							const musicId = await saveMusicAndGetId(
								audioData,
								mimeType,
								lockedJob.userId,
								result.prompt,
								result.model,
								variant.durationMs ?? result.durationMs,
								result.isInstrumental,
								undefined,
								variant.imageUrl ?? result.imageUrl,
								variant.videoUrl ?? result.videoUrl,
								variant.lyrics ?? result.lyrics
							);

							const title =
								(typeof variant.title === 'string' && variant.title.trim()) ||
								(index === 0 ? 'Generated Track' : `Generated Track ${index + 1}`);

							return {
								musicId,
								title,
								imageUrl: variant.imageUrl ?? result.imageUrl,
								videoUrl: variant.videoUrl ?? result.videoUrl,
								lyrics: variant.lyrics ?? result.lyrics,
								durationMs: variant.durationMs ?? result.durationMs,
								url: `/api/music/${musicId}`,
								// Needed later for get-timestamped-lyrics (per-clip karaoke sync).
								providerAudioId:
									typeof variant.id === 'string' && variant.id.trim()
										? variant.id.trim()
										: undefined
							};
						})
					);

					// Use provider cover art if present; only generate via Forge if art is completely missing
					await Promise.all(
						savedTracks.map(async (track, index) => {
							if (track.imageUrl) return;
							const coverSource = {
								...result,
								title: track.title,
								lyrics: track.lyrics
							};
							const imageUrl = await generateMusicCover(coverSource, lockedJob, {
								forceNew: false,
								variantIndex: index,
								title: track.title
							});
							if (!imageUrl) return;
							track.imageUrl = imageUrl;
							await db.update(music).set({ imageUrl }).where(eq(music.id, track.musicId));
						})
					);

					await UsageTrackingService.trackUsage(lockedJob.userId, 'audio').catch(console.error);

					const primary = savedTracks[0];
					result = {
						prompt: result.prompt,
						model: result.model,
						durationMs: primary?.durationMs ?? result.durationMs,
						isInstrumental: result.isInstrumental,
						providerTaskId: result.providerTaskId,
						musicId: primary?.musicId,
						musicIds: savedTracks.map((track) => track.musicId),
						title: primary?.title,
						imageUrl: primary?.imageUrl,
						videoUrl: primary?.videoUrl,
						lyrics: primary?.lyrics,
						tracks: savedTracks
					};

					// Karaoke timings — run completely in the background so the job finishes immediately!
					try {
						const { prefetchAlignedLyrics } = await import('$lib/server/music/align-lyrics.js');
						const taskId =
							typeof result.providerTaskId === 'string' ? result.providerTaskId : undefined;
						for (const track of savedTracks) {
							void prefetchAlignedLyrics(track.musicId, {
								taskId,
								audioId: track.providerAudioId
							}).catch((alignErr) =>
								console.warn(`[QUEUE] Aligned lyrics prefetch failed for ${track.musicId}:`, alignErr)
							);
						}
					} catch (alignErr) {
						console.warn(`[QUEUE] Aligned lyrics prefetch failed:`, alignErr);
					}
				} else {
					throw new Error(`Unsupported job type: ${lockedJob.type}`);
				}

				// Success! Mark completed and commit transaction
				await db.update(aiJobs)
					.set({ status: 'completed', result, completedAt: new Date() })
					.where(eq(aiJobs.id, lockedJob.id));

				if (lockedJob.transactionId) {
					await UsageTrackingService.commitTransaction(lockedJob.transactionId);
				}

			} catch (err: any) {
				if (lockedJob.type === 'music-generation' && isMusicGptRateLimitError(err)) {
					const backoffMs = getThrottleBackoffMs(lockedJob.attempts);
					console.warn(`[QUEUE] Job ${lockedJob.id} throttled by provider. Requeueing in ${backoffMs}ms.`);

					await db.update(aiJobs)
						.set({
							status: 'queued',
							errorMessage: null,
							startedAt: null,
							completedAt: null,
							updatedAt: new Date()
						})
						.where(eq(aiJobs.id, lockedJob.id));

					nextScheduleDelayMs = backoffMs;
				} else {
				console.error(`[QUEUE] Job ${lockedJob.id} failed:`, err);
				
				await db.update(aiJobs)
					.set({ status: 'failed', errorMessage: err.message, completedAt: new Date() })
					.where(eq(aiJobs.id, lockedJob.id));

				// Rollback transaction to refund user
				if (lockedJob.transactionId) {
					await UsageTrackingService.rollbackTransaction(lockedJob.transactionId, err.message);
				}
				}
			}

			// Process next in queue automatically
			PriorityQueueService.scheduleProcess(nextScheduleDelayMs);

		} catch (e) {
			console.error("[QUEUE] Worker error:", e);
		} finally {
			PriorityQueueService.isWorkerActive = false;
		}
	}

	/**
	 * Ejecutor específico para música
	 */
	private static async executeMusicGeneration(job: any): Promise<any> {
		const { getLocalMusicConfig, localAceStepProvider } = await import('$lib/ai/providers/local-acestep.js');
		const { sunoProvider } = await import('$lib/ai/providers/suno.js');
		const { musicgptProvider } = await import('$lib/ai/providers/musicgpt.js');
		// Dynamic import avoids circular dependencies or issues at boot
		const payload = job.payload;

		const requestedModel = payload.modelId || 'suno-v5.5';
		const isSunoModel = typeof requestedModel === 'string' && requestedModel.startsWith('suno-');
		const localConfig = await getLocalMusicConfig();

		// Local mode is exclusive: never leak a development job to a paid third-party API.
		if (localConfig.enabled) {
			return await localAceStepProvider.generateMusic?.({
				prompt: payload.prompt,
				modelId: 'qamuz-local-music',
				musicLengthMs: payload.musicLengthMs ?? undefined,
				forceInstrumental: payload.forceInstrumental,
				vocalGender: payload.vocalGender || 'female',
				referenceAudioUrl: payload.referenceAudioUrl
			});
		}

		const runMusicGpt = async (modelId: string) => {
			const maxAttempts = 3;
			for (let attempt = 1; attempt <= maxAttempts; attempt++) {
				try {
					return await musicgptProvider.generateMusic?.({
						prompt: payload.prompt,
						modelId,
						musicLengthMs: payload.musicLengthMs ?? undefined,
						forceInstrumental: payload.forceInstrumental,
						vocalGender: payload.vocalGender,
						referenceAudioUrl: payload.referenceAudioUrl
					});
				} catch (error) {
					if (!isMusicGptRateLimitError(error) || attempt === maxAttempts) {
						throw error;
					}

					const waitMs = attempt * 2500;
					console.warn(`[QUEUE] MusicGPT rate-limited (attempt ${attempt}/${maxAttempts}). Retrying in ${waitMs}ms.`);
					await delay(waitMs);
				}
			}

			throw new Error('MusicGPT retry loop exhausted');
		};

		try {
			if (isSunoModel) {
				return await sunoProvider.generateMusic?.({
					prompt: payload.prompt,
					modelId: requestedModel,
					musicLengthMs: payload.musicLengthMs ?? undefined,
					forceInstrumental: payload.forceInstrumental,
					vocalGender: payload.vocalGender,
					referenceAudioUrl: payload.referenceAudioUrl,
					customMode: payload.customMode,
					style: payload.style,
					title: payload.title,
					negativeTags: payload.negativeTags,
					styleWeight: payload.styleWeight,
					weirdnessConstraint: payload.weirdnessConstraint,
					audioWeight: payload.audioWeight,
					personaId: payload.personaId,
					personaModel: payload.personaModel
				});
			}

			return await runMusicGpt(requestedModel);
		} catch (error) {
			// Do not silently fall back to MusicGPT when the user selected Suno.
			// MusicGPT remains available only when modelId starts with musicgpt-.
			if (isSunoModel && isSunoProviderCreditError(error)) {
				console.warn(
					'[QUEUE] Suno credits insufficient — failing the job (MusicGPT auto-fallback disabled)'
				);
			}
			throw error;
		}
	}

	/**
	 * Espera activamente a que un trabajo termine (Long Polling interno)
	 */
	static async waitForJob(jobId: string, maxWaitMs = 120000): Promise<any> {
		const startTime = Date.now();
		const interval = 2000; // Check every 2 seconds

		while (Date.now() - startTime < maxWaitMs) {
			const [job] = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1);
			
			if (!job) throw new Error("Job not found");
			if (job.status === 'completed') return job.result;
			if (job.status === 'failed') throw new Error(job.errorMessage || 'Job failed');
			
			// Wait before next poll
			await new Promise(resolve => setTimeout(resolve, interval));
		}

		throw new Error("Job timeout - generation took too long");
	}
}
