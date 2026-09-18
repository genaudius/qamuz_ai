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
		name: 'black-forest-labs/FLUX.1-schnell',
		displayName: 'FLUX.1 Schnell (Fast)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'black-forest-labs/FLUX.1-dev',
		displayName: 'FLUX.1 Dev (High Quality)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VISION: STABLE DIFFUSION FAMILY ---
	{
		name: 'stabilityai/stable-diffusion-xl-base-1.0',
		displayName: 'SDXL 1.0 Base',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'stabilityai/stable-diffusion-3-medium-diffusers',
		displayName: 'Stable Diffusion 3 Medium',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'runwayml/stable-diffusion-v1-5',
		displayName: 'Stable Diffusion 1.5',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'stabilityai/stable-diffusion-2-1',
		displayName: 'Stable Diffusion 2.1',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VISION: OTHER OPEN SOURCE ARCHITECTURES ---
	{
		name: 'playgroundai/playground-v2.5-1024px-aesthetic',
		displayName: 'Playground v2.5 Aesthetic',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'PixArt-alpha/PixArt-Sigma-XL-2-1024-MS',
		displayName: 'PixArt-Sigma (Photorealism)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'Tencent-Hunyuan/HunyuanDiT-v1.2-Diffusers',
		displayName: 'Hunyuan DiT 1.2',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'kandinsky-community/kandinsky-2-2-decoder',
		displayName: 'Kandinsky 2.2',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'segmind/SSD-1B',
		displayName: 'SSD-1B (Fast SDXL)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VISION: ANIME/STYLIZED ---
	{
		name: 'Linaqruf/animagine-xl-2.0',
		displayName: 'Animagine XL 2.0 (Anime)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	{
		name: 'prompthero/openjourney',
		displayName: 'OpenJourney (Midjourney Style)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
	},
	// --- VIDEO GENERATION ---
	{
		name: 'stabilityai/stable-video-diffusion-img2vid-xt',
		displayName: 'Stable Video Diffusion (XT)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: false,
		supportsVideoGeneration: true,
	},
	{
		name: 'stabilityai/stable-video-diffusion-img2vid',
		displayName: 'Stable Video Diffusion (Base)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: false,
		supportsVideoGeneration: true,
	},
	// --- LEGACY ALIASES (Para compatibilidad con UI antigua) ---
	{
		name: 'qamuz-image-art',
		displayName: 'QAMUZ Vision Art (Legacy)',
		provider: 'qamuz',
		maxTokens: 0,
		supportsTextInput: true,
		supportsImageGeneration: true,
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
			const apiUrl = await getApiUrl();
			const response = await fetch(`${apiUrl}/v1/infer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					capability: 'qamuz-chat',
					model_id: model,
					messages,
					maxTokens,
					temperature
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`QAMUZ API Error ${response.status}: ${errorText}`);
			}

			const data = await response.json();

			if (stream) {
				// QAMUZ currently returns non-streaming JSON, wrap it in an async iterator for compatibility
				async function* streamResponse() {
					yield {
						content: data.result || '',
						done: true,
						type: 'text'
					} as AIStreamChunk;
				}
				return streamResponse();
			}

			return {
				content: data.result || '',
				model,
				usage: {
					promptTokens: 0,
					completionTokens: 0,
					totalTokens: 0
				}
			};
		} catch (error) {
			console.error('QAMUZ chat API error:', error);
			throw createProviderError('QAMUZ Maestro', error);
		}
	},

	async generateImage(params: ImageGenerationParams): Promise<AIImageResponse> {
		try {
			const apiUrl = await getApiUrl();
			const response = await fetch(`${apiUrl}/v1/infer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					capability: 'qamuz-image',
					model_id: params.model,
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
			const response = await fetch(`${apiUrl}/v1/infer`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					capability: 'qamuz-video',
					model_id: params.model,
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
