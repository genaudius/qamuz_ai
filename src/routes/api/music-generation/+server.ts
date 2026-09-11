import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sunoProvider, musicgptProvider } from '$lib/ai/index.js';
import { UsageTrackingService, UsageLimitError } from '$lib/server/usage-tracking.js';
import { CreditCostCalculator } from '$lib/server/ai/cost-calculator.js';
import { PriorityQueueService } from '$lib/server/ai/queue.js';
import { db } from '$lib/server/db/index.js';
import { aiJobs } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { getLocalMusicConfig } from '$lib/ai/providers/local-acestep.js';
import { getGenerationRateLimitPayload } from '$lib/server/file-upload-rate-limiting.js';

export const config = {
	maxDuration: 60 // Prevent Vercel timeout when downloading 2x 5MB MP3s
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	const jobId = url.searchParams.get('jobId');
	if (!jobId) {
		return json({ error: 'Job ID is required' }, { status: 400 });
	}

	const [job] = await db
		.select()
		.from(aiJobs)
		.where(eq(aiJobs.id, jobId))
		.limit(1);

	if (!job) {
		return json({ error: 'Job not found' }, { status: 404 });
	}

	if (job.userId !== session.user.id) {
		return json({ error: 'Access denied' }, { status: 403 });
	}

	// POLL KIE DIRECTLY IF IT'S A SUNO JOB
	if (job.status === 'processing' && job.payload && typeof job.payload === 'object' && (job.payload as any).taskId) {
		try {
			const { getKieMusicStatus, resolveKieAudioUrl } = await import('$lib/ai/providers/kie-music.js');
			const taskId = (job.payload as any).taskId;
			const data = await getKieMusicStatus(taskId);
			
			if (data.status === 'SUCCESS' || data.status === 'COMPLETED') {
				const ready = data.tracks?.filter((track: any) => Boolean(resolveKieAudioUrl(track))) || [];
				if (ready.length > 0) {
					// Atomically lock job status to prevent concurrent polling duplicate inserts
					const [lockAcquired] = await db
						.update(aiJobs)
						.set({ status: 'completed' })
						.where(and(eq(aiJobs.id, job.id), eq(aiJobs.status, 'processing')))
						.returning({ id: aiJobs.id });

					if (lockAcquired) {
						const { music } = await import('$lib/server/db/schema.js');
						const { randomUUID } = await import('crypto');

						const savedTracks = await Promise.all(ready.map(async (track: any, index: number) => {
							const audioUrl = resolveKieAudioUrl(track)!;
							const durationMs = Math.round(Number(track.duration || 210) * 1000);
							
							const lyricsText = track.prompt || track.lyrics || null;
							const genreText = (job.payload as any).style || (job.payload as any).genre || null;

							const [inserted] = await db.insert(music).values({
								id: randomUUID(),
								filename: `kie-${track.id || Date.now()}-${index}.mp3`,
								userId: session.user.id,
								mimeType: 'audio/mpeg',
								fileSize: 0,
								prompt: (job.payload as any).prompt || track.prompt || 'Generated Music',
								model: (job.payload as any).modelId || 'suno-v5.5',
								cloudPath: audioUrl,
								storageLocation: 'kie',
								durationMs: durationMs,
								imageUrl: track.imageUrl,
								videoUrl: track.videoUrl,
								title: track.title || `Generated Track ${index + 1}`,
								isInstrumental: (job.payload as any).instrumental || false,
								lyrics: lyricsText,
								genre: genreText
							}).returning({ id: music.id });

							return {
								musicId: inserted.id,
								title: track.title || `Generated Track ${index + 1}`,
								imageUrl: track.imageUrl,
								videoUrl: track.videoUrl,
								lyrics: lyricsText,
								durationMs: durationMs,
								url: audioUrl
							};
						}));

						const result = {
							prompt: (job.payload as any).prompt,
							model: (job.payload as any).modelId || 'suno-v5.5',
							tracks: savedTracks
						};

						await db.update(aiJobs).set({ result, completedAt: new Date() }).where(eq(aiJobs.id, job.id));
						job.status = 'completed';
						job.result = result;
					} else {
						// Another concurrent request completed it; fetch the finalized result
						const [fresh] = await db.select().from(aiJobs).where(eq(aiJobs.id, job.id)).limit(1);
						if (fresh) {
							job.status = fresh.status;
							job.result = fresh.result;
						}
					}
				}
			} else if (['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'].includes(data.status)) {
				const errorMessage = data.errorMessage || data.status;
				await db.update(aiJobs).set({ status: 'failed', errorMessage, completedAt: new Date() }).where(eq(aiJobs.id, job.id));
				job.status = 'failed';
				job.errorMessage = errorMessage;
			}
		} catch (e) {
			console.error('Error polling Kie:', e);
		}
	}

	const result = job.result && typeof job.result === 'object'
		? Object.fromEntries(Object.entries(job.result as Record<string, unknown>).filter(([key]) => key !== 'model'))
		: job.result;
	const prompt = job.payload && typeof job.payload === 'object'
		? (job.payload as Record<string, unknown>).prompt
		: undefined;

	return json({
		jobId: job.id,
		status: job.status,
		result,
		errorCode: job.status === 'failed' ? 'generation_unavailable' : null,
		errorMessage: job.status === 'failed' ? (job.errorMessage ?? null) : null,
		payload: { prompt }
	});
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Check authentication
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Check demo mode restrictions
		if (isDemoModeRestricted(!!session?.user?.id)) {
			return json({
				error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION,
				type: 'demo_mode_restricted'
			}, { status: 403 });
		}

		const rateLimited = getGenerationRateLimitPayload('musicGeneration', session.user.id);
		if (rateLimited) {
			return json(rateLimited, { status: 429 });
		}

		const body = await request.json();
		const {
			prompt,
			musicLengthMs, // Optional - local generation defaults to a full 3:30 song
			modelId = 'suno-v5.5',
			forceInstrumental = false,
			vocalGender = 'female',
			outputFormat = 'mp3_44100_128',
			referenceAudioUrl,
			customMode,
			style,
			title,
			negativeTags,
			styleWeight,
			weirdnessConstraint,
			audioWeight,
			personaId,
			personaModel
		} = body;

		// Validate required fields
		if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
			return json({ error: 'Prompt is required and must be a non-empty string' }, { status: 400 });
		}

		// Validate prompt length (ElevenLabs Music API limit)
		if (prompt.length > 4100) {
			return json({ error: 'Prompt exceeds maximum length of 4100 characters' }, { status: 400 });
		}

		// 🛡️ Run Qamuz Guardrail
		const { QamuzGuardrail } = await import('$lib/server/ai/guardrail.js');
		// Get real IP if behind proxy, otherwise use a fallback
		const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
		const guardrail = new QamuzGuardrail(session.user.id, clientIp);
		
		const safetyCheck = await guardrail.verifyText(prompt);
		if (!safetyCheck.valid) {
			return json({ 
				error: 'Tu petición no pudo ser procesada porque contraviene las políticas de contenido y uso responsable de Qamuz.',
				type: 'guardrail_violation',
				reason: safetyCheck.reason
			}, { status: 403 });
		}

		// Track usage and check limits

		// Validate duration range if provided (3 seconds to 5 minutes)
		// null/undefined = auto mode, skip validation
		if (musicLengthMs != null) {
			const durationMs = Number(musicLengthMs);
			if (isNaN(durationMs) || durationMs < 3000 || durationMs > 360000) {
				return json({ error: 'Music duration must be between 3 seconds and 6 minutes' }, { status: 400 });
			}
		}

		for (const [name, value] of Object.entries({ styleWeight, weirdnessConstraint, audioWeight })) {
			if (value != null && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1)) {
				return json({ error: `${name} must be between 0 and 1` }, { status: 400 });
			}
		}
		if (personaModel != null && !['style_persona', 'voice_persona'].includes(personaModel)) {
			return json({ error: 'Invalid persona model' }, { status: 400 });
		}

		if (!['male', 'female', 'duet'].includes(vocalGender)) {
			return json({ error: 'Vocal type must be male, female, or duet' }, { status: 400 });
		}

		// Validate model ID
		if (!modelId.startsWith('suno-') && !modelId.startsWith('musicgpt-')) {
			return json({ error: 'Invalid music model selection.' }, { status: 400 });
		}

		// ----------------------------------------------------
		// 1. Transactional Credit Hold
		// ----------------------------------------------------
		let transactionId: string | undefined;
		try {
			const localMusicEnabled = (await getLocalMusicConfig()).enabled;
			const billingProvider = localMusicEnabled
				? 'local'
				: modelId.startsWith('musicgpt')
					? 'musicgpt'
					: 'suno';
			const cost = CreditCostCalculator.getMusicCost(billingProvider);
			transactionId = await UsageTrackingService.holdTransaction(
				session.user.id,
				cost.credits,
				cost.resourceType,
				billingProvider === 'local' ? 'local' : billingProvider,
				billingProvider === 'local' ? 'qamuz-local-music' : modelId
			);
		} catch (error) {
			if (error instanceof UsageLimitError) {
				return json({
					error: error.message,
					type: 'usage_limit_exceeded',
					remainingQuota: error.remainingQuota
				}, { status: 402 }); // Payment Required
			}
			throw error; // Unexpected error
		}

		// ----------------------------------------------------
		// 2. Queue the generation job and return immediately
		// ----------------------------------------------------
		try {
			if (modelId.startsWith('suno-')) {
				const { sunoSubmitTask } = await import('$lib/ai/providers/suno.js');
				const taskId = await sunoSubmitTask({
					prompt: prompt.trim(),
					modelId,
					forceInstrumental: Boolean(forceInstrumental),
					customMode: customMode == null ? undefined : Boolean(customMode),
					style: typeof style === 'string' ? style.trim() : undefined,
					title: typeof title === 'string' ? title.trim().slice(0, 80) : undefined,
					callBackUrl: undefined,
					referenceAudioUrl,
					musicLengthMs: musicLengthMs ?? null,
					vocalGender,
					negativeTags: typeof negativeTags === 'string' ? negativeTags.trim() : undefined,
					styleWeight: styleWeight == null ? undefined : Number(styleWeight),
					weirdnessConstraint: weirdnessConstraint == null ? undefined : Number(weirdnessConstraint),
					audioWeight: audioWeight == null ? undefined : Number(audioWeight),
					personaId: typeof personaId === 'string' ? personaId.trim() : undefined,
					personaModel
				});

				const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
				await db.insert(aiJobs).values({
					id: jobId,
					userId: session.user.id,
					type: 'music-generation',
					payload: { prompt: prompt.trim(), modelId, taskId },
					priority: 1,
					transactionId,
					status: 'processing',
					startedAt: new Date(),
					attempts: 1
				});

				return json({
					jobId,
					status: 'queued',
					analysisText: 'Your track is generating on Kie AI. Please wait...'
				}, { status: 202 });
			} else {
				const jobId = await PriorityQueueService.enqueue(
					session.user.id,
					'music-generation',
					{
						prompt: prompt.trim(),
						modelId,
						musicLengthMs: musicLengthMs ?? null,
						forceInstrumental: Boolean(forceInstrumental),
						vocalGender,
						referenceAudioUrl,
						customMode: customMode == null ? undefined : Boolean(customMode),
						style: typeof style === 'string' ? style.trim() : undefined,
						title: typeof title === 'string' ? title.trim().slice(0, 80) : undefined,
						negativeTags: typeof negativeTags === 'string' ? negativeTags.trim() : undefined,
						styleWeight: styleWeight == null ? undefined : Number(styleWeight),
						weirdnessConstraint: weirdnessConstraint == null ? undefined : Number(weirdnessConstraint),
						audioWeight: audioWeight == null ? undefined : Number(audioWeight),
						personaId: typeof personaId === 'string' ? personaId.trim() : undefined,
						personaModel
					},
					transactionId
				);

				return json({
					jobId,
					status: 'queued',
					analysisText: 'Your track is generating in the background. You can keep using QAMUZ while it finishes.'
				}, { status: 202 });
			}
		} catch (error: any) {
			console.error('Music queue error:', error);
			await UsageTrackingService.rollbackTransaction(transactionId, error.message);
			return json({ error: error.message || 'Error generating music' }, { status: 500 });
		}

	} catch (error) {
		console.error('Music generation API error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};
