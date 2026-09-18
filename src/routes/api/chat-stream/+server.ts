import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getChatModelProvider } from '$lib/ai/index.js';
import type { AIMessage } from '$lib/ai/types.js';
import { UsageTrackingService, UsageLimitError } from '$lib/server/usage-tracking.js';
import { GUEST_MESSAGE_LIMIT, isModelAllowedForGuests } from '$lib/constants/guest-limits.js';
import { isDemoModeRestricted, isModelAllowedForDemo, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { removeWebSearchSuffix } from '$lib/constants/web-search.js';
import { db } from '$lib/server/db/index.js';
import { projects, projectFiles } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

/**
 * Builds a system message containing project custom instructions and file context.
 * Returns null if the project has no instructions and no files.
 */
async function buildProjectSystemMessage(projectId: string, userId: string): Promise<AIMessage | null> {
	const [project] = await db
		.select({
			customInstructions: projects.customInstructions,
			userId: projects.userId,
		})
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

	if (!project) return null;

	const files = await db
		.select({
			filename: projectFiles.filename,
			mimeType: projectFiles.mimeType,
			content: projectFiles.content,
		})
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId));

	let systemContent = '';

	if (project.customInstructions) {
		systemContent += `## Project Instructions\n${project.customInstructions}\n\n`;
	}

	if (files.length > 0) {
		systemContent += '## Project Context Files\n';
		for (const file of files) {
			systemContent += `\n---\nFile: ${file.filename} (${file.mimeType})\n---\n${file.content}\n`;
		}
	}

	if (!systemContent) return null;

	return {
		role: 'system' as const,
		content: systemContent.trim()
	};
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const { model, messages, maxTokens, temperature, userId, chatId, selectedTool, maxSteps } = body;

		if (!model) {
			return json({ error: 'Model is required' }, { status: 400 });
		}

		if (!messages || !Array.isArray(messages) || messages.length === 0) {
			return json({ error: 'Messages array is required and cannot be empty' }, { status: 400 });
		}

		// Get user session to check authentication status
		const session = await locals.getSession();
		const isLoggedIn = !!session?.user?.id;

		// Get base model name (without :online suffix) for validation
		const baseModel = removeWebSearchSuffix(model);

		// Validate guest user restrictions
		if (!isLoggedIn) {
			// Check guest message limit (count user messages only)
			const userMessages = messages.filter(msg => msg.role === 'user');
			if (userMessages.length > GUEST_MESSAGE_LIMIT) {
				return json({
					error: `Guest users are limited to ${GUEST_MESSAGE_LIMIT} messages. Please sign up for an account to continue.`,
					type: 'guest_limit_exceeded'
				}, { status: 429 });
			}

			// Check guest model restriction (use base model name)
			if (!isModelAllowedForGuests(baseModel)) {
				return json({
					error: 'Guest users can only use the allowed guest models. Please sign up for access to all models.',
					type: 'guest_model_restricted'
				}, { status: 403 });
			}
		}

		// Validate demo mode restrictions for logged-in users
		if (isLoggedIn && isDemoModeRestricted(isLoggedIn)) {
			// Check demo mode model restriction (use base model name)
			if (!isModelAllowedForDemo(baseModel)) {
				return json({
					error: DEMO_MODE_MESSAGES.MODEL_RESTRICTED,
					type: 'demo_model_restricted'
				}, { status: 403 });
			}
		}

		// Check usage limits for text generation (if userId provided)
		if (userId) {
			try {
				await UsageTrackingService.checkUsageLimit(userId, 'text');
			} catch (error) {
				if (error instanceof UsageLimitError) {
					return json({
						error: error.message,
						type: 'usage_limit_exceeded',
						remainingQuota: error.remainingQuota
					}, { status: 429 });
				}
				throw error; // Re-throw other errors
			}
		}

		// Inject project context if projectId provided
		if (body.projectId && session?.user?.id) {
			const projectSystemMsg = await buildProjectSystemMessage(body.projectId, session.user.id);
			if (projectSystemMsg) {
				messages.unshift(projectSystemMsg);
			}
		}

		const settings = await import('$lib/server/admin-settings.js').then(m => m.getAIModelSettings());
		
		let response;
		let usingQamuzProd = false;

		// Phase 3 Integration: Route to QAMUZ_PROD Maestro Engine if enabled
		if (settings.qamuz_prod_enabled === 'true') {
			console.log('🚀 [API /chat-stream] Intercepting for QAMUZ_PROD Maestro Engine');
			const qamuzApiUrl = settings.qamuz_prod_api_url || 'http://localhost:8000';
			const qamuzRes = await fetch(`${qamuzApiUrl}/v1/infer`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					capability: 'qamuz-chat',
					messages: messages,
					maxTokens,
					temperature
				})
			});

			if (!qamuzRes.ok) {
				const errText = await qamuzRes.text().catch(() => 'Unknown error');
				throw new Error(`QAMUZ_PROD error (${qamuzRes.status}): ${errText}`);
			}
			
			const qamuzData = await qamuzRes.json();
			const responseText = qamuzData.response || qamuzData.content || "";
			
			// Create a fake stream with a single chunk containing the full response
			response = (async function* () {
				// Add a slight delay to ensure Response is returned before stream closes
				await new Promise(r => setTimeout(r, 50));
				yield { content: responseText, done: false };
				await new Promise(r => setTimeout(r, 10));
				yield { content: "", done: true };
			})();
			usingQamuzProd = true;
		}

		if (!usingQamuzProd) {
			const provider = getChatModelProvider(model);
			if (!provider) {
				return json({ error: `No provider found for model: ${model}` }, { status: 400 });
			}

			// Find the model configuration to check its capabilities (use base model name)
			const modelConfig = provider.models.find(m => m.name === baseModel);

			// Tool handling (AI SDK v6): use tool names directly
			let toolNames: string[] = [];
			if (selectedTool) {
				toolNames = [selectedTool];
				console.log(`Using selected tool: ${selectedTool}`);
			}

			// Check if model supports functions when tools are requested
			if (toolNames.length > 0 && !modelConfig?.supportsFunctions) {
				console.warn(`Model ${model} does not support functions, tools will be ignored`);
				toolNames = [];
			}

			// Check if request has images (multimodal)
			const hasImageContent = messages.some((msg: any) =>
				msg.imageId || msg.imageData || msg.imageIds || msg.images ||
				(msg.role === 'user' && msg.type === 'image')
			);

			// Call appropriate provider method based on content type
			if (hasImageContent && provider.chatMultimodal) {
				console.log('🔀 [API /chat-stream] Using multimodal streaming');
				// Use multimodal chat with streaming enabled
				response = await provider.chatMultimodal({
					model,
					messages: messages as AIMessage[],
					maxTokens,
					temperature,
					stream: true, // Enable streaming for multimodal!
					userId,
					chatId,
					toolNames: toolNames.length > 0 ? toolNames : undefined,
					maxSteps
				});
			} else {
				console.log('💬 [API /chat-stream] Using regular text streaming');
				// Call the provider's chat method with streaming enabled
				response = await provider.chat({
					model,
					messages: messages as AIMessage[],
					maxTokens,
					temperature,
					stream: true, // Enable streaming
					userId,
					chatId,
					toolNames: toolNames.length > 0 ? toolNames : undefined,
					maxSteps
				});
			}
		}

		// The response is already an AsyncIterableIterator<AIStreamChunk>
		const encoder = new TextEncoder();
		const iterator = (response as AsyncIterableIterator<any>)[Symbol.asyncIterator]();
		const readable = new ReadableStream({
			async pull(controller) {
				try {
					const { value: chunk, done: isDone } = await iterator.next();
					if (isDone) {
						controller.close();
						return;
					}
					
					// Send the chunk as a data event
					const data = `data: ${JSON.stringify(chunk)}\n\n`;
					controller.enqueue(encoder.encode(data));

					if (chunk.done) {
						// Track usage for successful streaming completion
						if (userId) {
							UsageTrackingService.trackUsage(userId, 'text').catch(console.error);
						}
						controller.enqueue(encoder.encode('data: [DONE]\n\n'));
						controller.close();
					}
				} catch (error) {
					const errorData = `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`;
					controller.enqueue(encoder.encode(errorData));
					controller.close();
				}
			}
		});

		return new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive'
			}
		});

	} catch (error) {
		console.error('Chat stream API error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};
