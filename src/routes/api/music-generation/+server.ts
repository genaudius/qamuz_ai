import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sunoProvider, musicgptProvider, openRouterProvider } from '$lib/ai/index.js';
import { UsageTrackingService, UsageLimitError } from '$lib/server/usage-tracking.js';
import { CreditCostCalculator } from '$lib/server/ai/cost-calculator.js';
import { PriorityQueueService } from '$lib/server/ai/queue.js';
import { saveMusicAndGetId } from '$lib/ai/utils.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

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
		// 2. Generate Analysis Text
		// ----------------------------------------------------
		let analysisText = '';
		try {
			const systemPrompt = `You are an expert music producer and DJ. The user will provide a prompt for a song they want to generate.
Analyze the prompt and respond with a short, hype-filled, 1-2 paragraph description of the vibe, genre, and style of the song you are about to create for them.
Keep it casual, enthusiastic, and sound like a pro producer. Example: "Got it. We’re heading into that lush, late-night R&B territory. Think deep bass and velvet textures..."`;

			// Asignar coste de OpenRouter (estimado a 200 tokens) pero no hacemos hold en este momento para evitar transacciones complejas.
			// Solo hacemos hold de la música pesada.
			const chatResponse = await openRouterProvider.chat({
				model: 'openai/gpt-4o-mini',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: prompt }
				],
				maxTokens: 200,
				temperature: 0.8
			});

			// @ts-ignore
			analysisText = 'content' in chatResponse ? chatResponse.content : '';
		} catch (error) {
			console.warn('Failed to generate analysis text:', error);
			analysisText = 'Got the prompt! Generating your track now...';
		}

		// ----------------------------------------------------
		// 3. Queue the generation job and wait for result
		// ----------------------------------------------------
		let response;
		try {
			// Enqueue job with transaction ID for auto-commit/rollback
			const jobId = await PriorityQueueService.enqueue(
				session.user.id, 
				'music-generation', 
				{
					prompt: prompt.trim(),
					modelId,
					forceInstrumental: Boolean(forceInstrumental),
					referenceAudioUrl
				},
				transactionId
			);

			// We wait synchronously for the job to complete to avoid breaking the frontend UI.
			// If we wanted to make it purely async, we would return 202 Accepted here with the jobId.
			response = await PriorityQueueService.waitForJob(jobId, 240000); // Wait up to 4 minutes

		} catch (error: any) {
			console.error('Music queue error:', error);
			// Rollback if the queue completely crashed (should be handled by queue normally)
			await UsageTrackingService.rollbackTransaction(transactionId, error.message);
			return json({ error: error.message || 'Error generating music' }, { status: 500 });
		}

		// Save music to storage and database
		const musicId = await saveMusicAndGetId(
			response.audioData,
			response.mimeType,
			session.user.id,
			response.prompt,
			response.model,
			response.durationMs,
			response.isInstrumental,
			undefined, // chatId
			response.imageUrl,
			response.videoUrl,
			response.lyrics
		);

		// Track usage for successful music generation
		UsageTrackingService.trackUsage(session.user.id, 'audio').catch(console.error);

		// Return the music response with the database ID and the analysis text
		return json({
			...response,
			musicId,
			analysisText
		});

	} catch (error) {
		console.error('Music generation API error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};
