import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sunoProvider, musicgptProvider } from '$lib/ai/index.js';
import { UsageTrackingService, UsageLimitError } from '$lib/server/usage-tracking.js';
import { CreditCostCalculator } from '$lib/server/ai/cost-calculator.js';
import { PriorityQueueService } from '$lib/server/ai/queue.js';
import { db } from '$lib/server/db/index.js';
import { aiJobs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

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

	return json({
		jobId: job.id,
		status: job.status,
		result: job.result,
		errorMessage: job.errorMessage,
		payload: job.payload
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

		const body = await request.json();
		const {
			prompt,
			musicLengthMs, // Optional - if not provided, model chooses duration based on prompt
			modelId = 'suno-v5.5',
			forceInstrumental = false,
			outputFormat = 'mp3_44100_128',
			referenceAudioUrl
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
			if (isNaN(durationMs) || durationMs < 3000 || durationMs > 300000) {
				return json({ error: 'Music duration must be between 3 seconds (3000ms) and 5 minutes (300000ms)' }, { status: 400 });
			}
		}

		// Validate model ID
		if (!modelId.startsWith('suno-') && !modelId.startsWith('musicgpt-')) {
			return json({ error: `Invalid music model: ${modelId}. Valid models: Suno and MusicGPT models.` }, { status: 400 });
		}

		// ----------------------------------------------------
		// 1. Transactional Credit Hold
		// ----------------------------------------------------
		let transactionId: string | undefined;
		try {
			const cost = CreditCostCalculator.getMusicCost();
			transactionId = await UsageTrackingService.holdTransaction(
				session.user.id, 
				cost.credits, 
				cost.resourceType, 
				modelId.startsWith('musicgpt') ? 'musicgpt' : 'suno', 
				modelId
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
			const jobId = await PriorityQueueService.enqueue(
				session.user.id,
				'music-generation',
				{
					prompt: prompt.trim(),
					modelId,
					musicLengthMs: musicLengthMs ?? null,
					forceInstrumental: Boolean(forceInstrumental),
					referenceAudioUrl
				},
				transactionId
			);

			return json({
				jobId,
				status: 'queued',
				analysisText: 'Your track is generating in the background. You can keep using QAMUZ while it finishes.'
			}, { status: 202 });
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
