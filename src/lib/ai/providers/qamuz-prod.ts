import type {
	AIProvider,
	AIModelConfig,
	AIResponse,
	AIStreamChunk,
	AIMessage,
	ImageGenerationParams,
	AIImageResponse,
	VideoGenerationParams,
	AIVideoResponse
} from '../types.js';
import { saveImageAndGetId, saveVideoAndGetId, createProviderError } from '../utils.js';
import { getAIModelSettings } from '$lib/server/admin-settings.js';

export const QAMUZ_MODELS: AIModelConfig[] = [
	{
		name: 'qamuz-chat',
		displayName: 'QAMUZ Maestro Engine',
		provider: 'qamuz',
		maxTokens: 4096,
		supportsTextInput: true,
		supportsVision: true,
		supportsTools: true,
		supportsSystemPrompts: true,
		supportsStreaming: true,
		supportsImageGeneration: false,
		supportsVideoGeneration: false,
		supportsAudioGeneration: false
	},
	// --- VISON: FLUX FAMILY ---
	{
		name: 'qamuz-vision-fast',
		displayName: 'QAMUZ Vision Fast',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-pro',
		displayName: 'QAMUZ Vision Pro',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VISION: STABLE DIFFUSION FAMILY ---
	{
		name: 'qamuz-vision-art',
		displayName: 'QAMUZ Vision Art',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-v3',
		displayName: 'QAMUZ Vision v3',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-classic',
		displayName: 'QAMUZ Vision Classic',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-v2',
		displayName: 'QAMUZ Vision v2',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VISION: OTHER OPEN SOURCE ARCHITECTURES ---
	{
		name: 'qamuz-vision-play',
		displayName: 'QAMUZ Vision Play',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-photo',
		displayName: 'QAMUZ Vision Photo',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-fusion',
		displayName: 'QAMUZ Vision Fusion',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-k',
		displayName: 'QAMUZ Vision K',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-speed',
		displayName: 'QAMUZ Vision Speed',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VISION: ANIME/STYLIZED ---
	{
		name: 'qamuz-vision-anime',
		displayName: 'QAMUZ Vision Anime',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-vision-journey',
		displayName: 'QAMUZ Vision Journey',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VIDEO GENERATION ---
	{
		name: 'qamuz-video-xt',
		displayName: 'QAMUZ Video Motion XT',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: false,
		supportsVideoGeneration: true,
	},
	{
		name: 'qamuz-video-base',
		displayName: 'QAMUZ Video Motion Base',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: false,
		supportsVideoGeneration: true,
	},
	// --- LEGACY ALIASES (Para compatibilidad con UI antigua) ---
	{
		name: 'qamuz-image-flux',
		displayName: 'QAMUZ Vision Fast (Legacy)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'qamuz-video-svd',
		displayName: 'QAMUZ Video Motion (Legacy)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: false,
		supportsVideoGeneration: true,
	}
].map(m => ({
	...m,
	supportsVision: m.supportsVision || false,
	supportsTools: m.supportsTools || false,
	supportsSystemPrompts: m.supportsSystemPrompts || false,
	supportsStreaming: m.supportsStreaming || false,
	supportsVideoGeneration: m.supportsVideoGeneration || false,
	supportsAudioGeneration: m.supportsAudioGeneration || false
}));

export const QAMUZ_REAL_MODELS: Record<string, string> = {
	'qamuz-vision-fast': 'black-forest-labs/FLUX.1-schnell',
	'qamuz-image-flux': 'black-forest-labs/FLUX.1-schnell', // legacy
	'qamuz-vision-pro': 'black-forest-labs/FLUX.1-dev',
	'qamuz-vision-art': 'stabilityai/stable-diffusion-xl-base-1.0',
	'qamuz-image-art': 'stabilityai/stable-diffusion-xl-base-1.0', // legacy
	'qamuz-vision-v3': 'stabilityai/stable-diffusion-3-medium-diffusers',
	'qamuz-vision-classic': 'runwayml/stable-diffusion-v1-5',
	'qamuz-vision-v2': 'stabilityai/stable-diffusion-2-1',
	'qamuz-vision-play': 'playgroundai/playground-v2.5-1024px-aesthetic',
	'qamuz-vision-photo': 'PixArt-alpha/PixArt-Sigma-XL-2-1024-MS',
	'qamuz-vision-fusion': 'Tencent-Hunyuan/HunyuanDiT-v1.2-Diffusers',
	'qamuz-vision-k': 'kandinsky-community/kandinsky-2-2-decoder',
	'qamuz-vision-speed': 'segmind/SSD-1B',
	'qamuz-vision-anime': 'Linaqruf/animagine-xl-2.0',
	'qamuz-vision-journey': 'prompthero/openjourney',
	'qamuz-video-xt': 'stabilityai/stable-video-diffusion-img2vid-xt',
	'qamuz-video-base': 'stabilityai/stable-video-diffusion-img2vid',
	'qamuz-video-svd': 'stabilityai/stable-video-diffusion-img2vid-xt', // legacy
};

// Helper to get QAMUZ API URL
async function getApiUrl(): Promise<string> {
	const settings = await getAIModelSettings();
	return settings.qamuz_prod_api_url || 'http://localhost:8000';
}

export const qamuzProdProvider: AIProvider = {
	name: 'QAMUZ Maestro',
	models: QAMUZ_MODELS,

	async chat({ model, messages, maxTokens = 1024, temperature = 0.7, stream = false }) {
		try {
			const { env } = await import('$env/dynamic/private');
			const { createOpenAI } = await import('@ai-sdk/openai');
			const { streamText, generateText } = await import('ai');

			// Each cloud provider can require a different credential. Prefer the
			// dedicated RunPod configuration and retain the shared legacy list for
			// Modal, Crusoe, and local development.
			const inferenceTargets: Array<{ baseURL: string; apiKey: string }> = [];
			const runpodEndpoint = env.QAMUZ_RUNPOD_ENDPOINT?.trim();
			const runpodApiKey = env.QAMUZ_RUNPOD_API_KEY?.trim();

			if (runpodEndpoint && runpodApiKey) {
				inferenceTargets.push({
					baseURL: runpodEndpoint.replace(/\/$/, ''),
					apiKey: runpodApiKey
				});
			}

			const sharedApiKey = env.QAMUZ_VLLM_API_KEY?.trim() || 'empty';
			const legacyEndpoints = (env.QAMUZ_VLLM_ENDPOINTS || 'http://localhost:8000/v1')
				.split(',')
				.map((endpoint) => endpoint.trim().replace(/\/$/, ''))
				.filter((endpoint) => endpoint && !endpoint.includes('your-'));

			for (const baseURL of legacyEndpoints) {
				if (!inferenceTargets.some((target) => target.baseURL === baseURL)) {
					inferenceTargets.push({ baseURL, apiKey: sharedApiKey });
				}
			}

			if (inferenceTargets.length === 0) {
				throw new Error('No QAMUZ vLLM inference endpoints are configured');
			}

			const selectedTarget = inferenceTargets[Math.floor(Math.random() * inferenceTargets.length)];

			const vllm = createOpenAI({
				baseURL: selectedTarget.baseURL,
				apiKey: selectedTarget.apiKey,
			});

			// Note: We pass the literal `model` (e.g. 'qamuz-chat')
			// vLLM instances MUST be started with `--served-model-name qamuz-chat`

			if (stream) {
				const result = await streamText({
					model: vllm(model) as any,
					messages: messages as any,
					maxOutputTokens: maxTokens,
					temperature,
				});

				async function* createAISDKStreamIterator(): AsyncIterableIterator<AIStreamChunk> {
					try {
						for await (const part of result.fullStream) {
							switch (part.type) {
								case 'text-delta':
									yield {
										content: part.text,
										done: false,
										type: 'text'
									};
									break;
								case 'finish':
									yield {
										content: '',
										done: true,
										type: 'finish',
										finishReason: part.finishReason as any,
									};
									break;
								case 'error':
									throw new Error(part.error?.toString() || 'Unknown streaming error');
							}
						}
					} catch (error) {
						throw new Error(`vLLM streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				}

				return createAISDKStreamIterator();
			}

			const result = await generateText({
				model: vllm(model) as any,
				messages: messages as any,
				maxOutputTokens: maxTokens,
				temperature,
			});

			const promptTokens = result.usage.inputTokens ?? 0;
			const completionTokens = result.usage.outputTokens ?? 0;

			return {
				content: result.text || '',
				model,
				usage: {
					promptTokens,
					completionTokens,
					totalTokens: result.usage.totalTokens ?? promptTokens + completionTokens
				},
				finishReason: result.finishReason as any
			};

		} catch (error) {
			console.error('vLLM API Error:', error);
			throw new Error(`vLLM API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	},

	async generateImage(params: ImageGenerationParams): Promise<AIImageResponse> {
		try {
			const apiUrl = await getApiUrl();
			const realModelId = QAMUZ_REAL_MODELS[params.model] || params.model;
			
			const response = await fetch(`${apiUrl}/v1/infer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					capability: 'qamuz-image',
					model_id: realModelId,
					prompt: params.prompt
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`QAMUZ API Error ${response.status}: ${errorText}`);
			}

			const data = await response.json();
			const b64_res = data.result;
			
			// Remove data URL prefix if present
			const base64Data = b64_res.includes(',') ? b64_res.split(',')[1] : b64_res;
			
			const imageId = await saveImageAndGetId(
				base64Data,
				'image/png',
				params.userId,
				params.chatId,
				{
					prompt: params.prompt,
					model: params.model,
					provider: 'QAMUZ Maestro'
				}
			);

			return {
				imageId,
				mimeType: 'image/png',
				prompt: params.prompt,
				model: params.model
			};
		} catch (error) {
			console.error('QAMUZ image generation error:', error);
			throw createProviderError('QAMUZ Maestro', error);
		}
	},

	async generateVideo(params: VideoGenerationParams): Promise<AIVideoResponse> {
		try {
			const apiUrl = await getApiUrl();
			const realModelId = QAMUZ_REAL_MODELS[params.model] || params.model;
			
			const response = await fetch(`${apiUrl}/v1/infer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					capability: 'qamuz-video',
					model_id: realModelId,
					prompt: params.prompt,
					image_b64: params.imageUrl || ''
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`QAMUZ API Error ${response.status}: ${errorText}`);
			}

			const data = await response.json();
			const b64_res = data.result;
			
			// Remove data URL prefix if present
			const base64Data = b64_res.includes(',') ? b64_res.split(',')[1] : b64_res;

			const videoId = await saveVideoAndGetId(
				base64Data,
				'video/mp4',
				params.userId,
				params.chatId,
				{
					prompt: params.prompt,
					model: params.model,
					provider: 'QAMUZ Maestro'
				}
			);

			return {
				videoId,
				mimeType: 'video/mp4',
				prompt: params.prompt,
				model: params.model
			};
		} catch (error) {
			console.error('QAMUZ video generation error:', error);
			throw createProviderError('QAMUZ Maestro', error);
		}
	}
};
