import { db } from '../db/index.js';
import { aiJobs, users } from '../db/schema.js';
import { eq, and, asc, isNull, lte, or, sql } from 'drizzle-orm';
import { UsageTrackingService } from '../usage-tracking.js';
// We'll import provider runners dynamically or define a simple registry

export type JobType = 'music-generation' | 'video-generation' | 'image-generation';

export interface JobPayload {
	prompt?: string;
	model?: string;
	[key: string]: any;
}

export class PriorityQueueService {
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
		setTimeout(() => PriorityQueueService.processNext(), 100);

		return job.id;
	}

	/**
	 * Worker process: obtiene el trabajo más prioritario y lo ejecuta
	 */
	static async processNext(): Promise<void> {
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
					eq(aiJobs.status, 'queued') // Ensure nobody else took it
				))
				.returning();

			if (!lockedJob) {
				// Someone else picked it up
				return PriorityQueueService.processNext();
			}

			console.log(`[QUEUE] Processing job ${lockedJob.id} of type ${lockedJob.type}`);

			// Dynamically route job based on type
			try {
				let result = {};
				
				if (lockedJob.type === 'music-generation') {
					result = await PriorityQueueService.executeMusicGeneration(lockedJob);
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
				console.error(`[QUEUE] Job ${lockedJob.id} failed:`, err);
				
				await db.update(aiJobs)
					.set({ status: 'failed', errorMessage: err.message, completedAt: new Date() })
					.where(eq(aiJobs.id, lockedJob.id));

				// Rollback transaction to refund user
				if (lockedJob.transactionId) {
					await UsageTrackingService.rollbackTransaction(lockedJob.transactionId, err.message);
				}
			}

			// Process next in queue automatically
			setTimeout(() => PriorityQueueService.processNext(), 100);

		} catch (e) {
			console.error("[QUEUE] Worker error:", e);
		}
	}

	/**
	 * Ejecutor específico para música
	 */
	private static async executeMusicGeneration(job: any): Promise<any> {
		const { sunoProvider } = await import('$lib/ai/providers/suno.js');
		// Dynamic import avoids circular dependencies or issues at boot
		const payload = job.payload;
		
		// This simulates the actual generation logic. Since Suno takes time, 
		// we await the actual generation. (In real life sunoProvider might return an ID to poll)
		const response = await sunoProvider.generateMusic?.({
			prompt: payload.prompt,
			modelId: payload.modelId, // Updated to modelId to match API
			forceInstrumental: payload.forceInstrumental, // Updated to match API
			referenceAudioUrl: payload.referenceAudioUrl
		});
		
		return response;
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
