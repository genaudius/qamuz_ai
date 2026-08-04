import { db } from '../db/index.js';
import { aiJobs, users } from '../db/schema.js';
import { eq, and, asc, isNull, lte, or, sql } from 'drizzle-orm';
import { UsageTrackingService } from '../usage-tracking.js';
import { saveMusicAndGetId } from '$lib/ai/utils.js';
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
				let result = {};
				
				if (lockedJob.type === 'music-generation') {
					result = await PriorityQueueService.executeMusicGeneration(lockedJob);
					const musicId = await saveMusicAndGetId(
						result.audioData,
						result.mimeType,
						lockedJob.userId,
						result.prompt,
						result.model,
						result.durationMs,
						result.isInstrumental,
						undefined,
						result.imageUrl,
						result.videoUrl,
						result.lyrics
					);

					await UsageTrackingService.trackUsage(lockedJob.userId, 'audio').catch(console.error);

					result = {
						...result,
						musicId,
					};
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
					referenceAudioUrl: payload.referenceAudioUrl
				});
			}

			return await runMusicGpt(requestedModel);
		} catch (error) {
			if (!isSunoModel || !isSunoProviderCreditError(error)) {
				throw error;
			}

			console.warn('[QUEUE] Suno credits insufficient, retrying job with MusicGPT fallback');
			return await runMusicGpt('musicgpt-v1');
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
