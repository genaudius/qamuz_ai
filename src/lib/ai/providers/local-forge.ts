import type { AIImageResponse, ImageGenerationParams } from '../types.js';
import { env } from '$env/dynamic/private';
import { adminSettingsService } from '$lib/server/admin-settings.js';
import { saveImageAndGetId } from '../utils.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:7860';

function isEnabledFlag(value: unknown): boolean {
	return value === true || value === 'true' || value === '1';
}

export async function getLocalImageConfig() {
	const [enabledSetting, baseUrlSetting] = await Promise.all([
		adminSettingsService.getSetting('local_image_enabled').catch(() => null),
		adminSettingsService.getSetting('local_image_base_url').catch(() => null)
	]);
	const url = new URL(baseUrlSetting || env.LOCAL_IMAGE_BASE_URL || DEFAULT_BASE_URL);
	if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Local image URL must use HTTP or HTTPS');
	return {
		enabled: isEnabledFlag(enabledSetting ?? env.LOCAL_IMAGE_ENABLED ?? 'false'),
		baseUrl: url.toString().replace(/\/$/, '')
	};
}

export async function isLocalImageReady(): Promise<{
	ready: boolean;
	enabled: boolean;
	baseUrl: string;
	reason?: string;
}> {
	const config = await getLocalImageConfig();
	try {
		const response = await fetch(`${config.baseUrl}/sdapi/v1/sd-models`, {
			signal: AbortSignal.timeout(4000)
		});
		if (!response.ok) {
			return { ...config, ready: false, reason: `Forge HTTP ${response.status}` };
		}
		return { ...config, ready: true };
	} catch (error) {
		return {
			...config,
			ready: false,
			reason: error instanceof Error ? error.message : String(error)
		};
	}
}

function dimensions(size?: string): { width: number; height: number } {
	const exact = size?.match(/^(\d{3,4})x(\d{3,4})$/i);
	if (exact) {
		return {
			width: Math.max(256, Math.min(1536, Number(exact[1]))),
			height: Math.max(256, Math.min(1536, Number(exact[2])))
		};
	}
	if (size === '16:9') return { width: 768, height: 432 };
	if (size === '9:16') return { width: 432, height: 768 };
	if (size === '4:3') return { width: 640, height: 480 };
	if (size === '3:4') return { width: 480, height: 640 };
	return { width: 512, height: 512 };
}

export async function generateLocalImage(
	params: ImageGenerationParams,
	options: { requireEnabled?: boolean } = {}
): Promise<AIImageResponse> {
	if (!params.userId) throw new Error('User ID is required for image generation');
	if (params.imageUrl || params.imageUrls?.length) {
		throw new Error('Local reference-image generation is not available yet');
	}
	const config = await getLocalImageConfig();
	if (options.requireEnabled !== false && !config.enabled) {
		throw new Error('Local image provider is not enabled');
	}
	const { width, height } = dimensions(params.size);
	const steps = params.quality === 'high' ? 24 : params.quality === 'medium' ? 20 : 16;
	const response = await fetch(`${config.baseUrl}/sdapi/v1/txt2img`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			prompt: [params.prompt, params.style].filter(Boolean).join(', '),
			negative_prompt: 'text, watermark, logo, low quality, distorted',
			width,
			height,
			steps,
			cfg_scale: 1,
			distilled_cfg_scale: 3.5,
			sampler_name: 'Euler',
			scheduler: 'Simple',
			batch_size: Math.max(1, Math.min(4, params.numberOfImages ?? 1)),
			n_iter: 1,
			seed: params.seed ?? -1
		}),
		signal: AbortSignal.timeout(10 * 60_000)
	});
	if (!response.ok) {
		const details = await response.text().catch(() => '');
		throw new Error(`Local image service request failed (${response.status}): ${details.slice(0, 400)}`);
	}
	const result = await response.json() as { images?: string[] };
	if (!result.images?.length) throw new Error('Local image service returned no image');

	let firstImageId = '';
	for (const imageData of result.images) {
		const imageId = await saveImageAndGetId(imageData.replace(/^data:image\/\w+;base64,/, ''), 'image/png', params.userId, params.chatId, {
			prompt: params.prompt,
			model: 'qamuz-local-image',
			aspectRatio: params.size,
			seed: params.seed,
			quality: params.quality,
			style: params.style,
			numberOfImages: params.numberOfImages
		});
		if (!firstImageId) firstImageId = imageId;
	}

	return {
		imageId: firstImageId,
		mimeType: 'image/png',
		prompt: params.prompt,
		model: 'qamuz-local-image'
	};
}
