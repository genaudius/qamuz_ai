import { NextResponse, type NextRequest } from 'next/server';
import { getModelProvider } from '@/src/lib/ai/index';
import type { ImageGenerationParams, AIImageStreamChunk } from '@/src/lib/ai/types';
import { UsageTrackingService, UsageLimitError } from '@/src/lib/server/usage-tracking';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '@/src/lib/constants/demo-mode';
import { getAuth } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const auth = await getAuth();
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
		}

		// Check demo mode restrictions
		if (isDemoModeRestricted(!!session?.user?.id)) {
			return NextResponse.json({ error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION }, { status: 403 });
		}

		const body = await request.json();
		const { model, prompt, quality, size, style, stream = false, partial_images = 2, chatId, imageUrl, imageUrls, seed, numberOfImages, upscaleFactor, compressionQuality } = body;

		if (!model) {
			return NextResponse.json({ error: 'Model is required' }, { status: 400 });
		}

		// Get provider and model config early to check if prompt is required
		const provider = getModelProvider(model);
		if (!provider) {
			return NextResponse.json({ error: `No provider found for model: ${model}` }, { status: 400 });
		}

		const modelConfig = provider.models.find(m => m.name === model);

		// Check if model requires text input (upscalers don't need prompts)
		const requiresPrompt = modelConfig?.supportsTextInput !== false;

		if (requiresPrompt && (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0)) {
			return NextResponse.json({ error: 'Prompt is required and must be a non-empty string' }, { status: 400 });
		}

		// Validate seed if provided (must be a non-negative 32-bit integer)
		const MAX_SEED = 2147483647; // 32-bit signed integer max
		if (seed !== undefined && seed !== null) {
			const seedNum = Number(seed);
			if (!Number.isInteger(seedNum) || seedNum < 0 || seedNum > MAX_SEED) {
				return NextResponse.json({ error: `Seed must be a non-negative integer (max ${MAX_SEED})` }, { status: 400 });
			}
		}

		// Validate imageUrls if provided (must be an array of strings)
		if (imageUrls !== undefined && imageUrls !== null) {
			if (!Array.isArray(imageUrls)) {
				return NextResponse.json({ error: 'imageUrls must be an array' }, { status: 400 });
			}
			for (const url of imageUrls) {
				if (typeof url !== 'string') {
					return NextResponse.json({ error: 'Each imageUrl must be a string' }, { status: 400 });
				}
			}
		}

		// Validate compressionQuality if provided (must be 1-100)
		if (compressionQuality !== undefined && compressionQuality !== null) {
			const compNum = Number(compressionQuality);
			if (!Number.isInteger(compNum) || compNum < 1 || compNum > 100) {
				return NextResponse.json({ error: 'compressionQuality must be an integer between 1 and 100' }, { status: 400 });
			}
		}

		// Check usage limits for image generation
		try {
			const cost = UsageTrackingService.calculateCost('image');
			await UsageTrackingService.checkUsageLimit(session.user.id, cost);
		} catch (error) {
			if (error instanceof UsageLimitError) {
				return NextResponse.json({
					error: error.message,
					type: 'usage_limit_exceeded',
					remainingQuota: error.remainingQuota
				}, { status: 429 });
			}
			throw error; // Re-throw other errors
		}

		if (!provider.generateImage) {
			return NextResponse.json({ error: `Model ${model} does not support image generation` }, { status: 400 });
		}

		// Check if model supports streaming when requested
		if (stream && !modelConfig?.supportsImageStreaming) {
			return NextResponse.json({ error: `Model ${model} does not support streaming image generation` }, { status: 400 });
		}

		const params: ImageGenerationParams = {
			model,
			prompt: prompt?.trim() || '',
			quality,
			size,
			style,
			stream,
			partial_images,
			userId: session.user.id,
			chatId,
			imageUrl,
			imageUrls,
			seed,
			numberOfImages,
			upscaleFactor,
			compressionQuality
		};

		const response = await provider.generateImage(params);

		// Handle streaming response
		if (stream && typeof response === 'object' && response !== null && Symbol.asyncIterator in response) {
			const encoder = new TextEncoder();
			const readable = new ReadableStream({
				async start(controller) {
					try {
						for await (const chunk of response as AsyncIterableIterator<AIImageStreamChunk>) {
							const data = `data: ${JSON.stringify(chunk)}\n\n`;
							controller.enqueue(encoder.encode(data));
							
							if (chunk.done) {
								// Track usage for successful streaming image generation
								if (session.user?.id) {
									const cost = UsageTrackingService.calculateCost('image');
									UsageTrackingService.trackUsage(session.user.id, cost).catch(console.error);
								}
								break;
							}
						}
						controller.close();
					} catch (error) {
						console.error('Streaming error:', error);
						const errorChunk: AIImageStreamChunk = {
							type: 'image_generation.complete',
							done: true
						};
						const errorData = `data: ${JSON.stringify(errorChunk)}\n\n`;
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
		}

		// Track usage for successful image generation (non-streaming)
		const cost = UsageTrackingService.calculateCost('image');
		UsageTrackingService.trackUsage(session.user.id, cost).catch(console.error);

		// Non-streaming response
		return NextResponse.json(response);

	} catch (error) {
		console.error('Image generation API error:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
}
