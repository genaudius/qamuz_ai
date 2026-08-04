import type { AIVideoResponse, VideoGenerationParams } from '../types.js';
import { env } from '$env/dynamic/private';
import { adminSettingsService } from '$lib/server/admin-settings.js';
import { saveVideoAndGetId } from '../utils.js';
import { db } from '$lib/server/db/index.js';
import { images } from '$lib/server/db/schema.js';
import { storageService } from '$lib/server/storage.js';
import { eq } from 'drizzle-orm';

const DEFAULT_BASE_URL = 'http://127.0.0.1:42005';
const POLL_INTERVAL_MS = 3_000;
const GENERATION_TIMEOUT_MS = 30 * 60_000;

export async function getLocalVideoConfig() {
	const [enabledSetting, baseUrlSetting] = await Promise.all([
		adminSettingsService.getSetting('local_video_enabled').catch(() => null),
		adminSettingsService.getSetting('local_video_base_url').catch(() => null)
	]);
	const url = new URL(baseUrlSetting ?? env.LOCAL_VIDEO_BASE_URL ?? DEFAULT_BASE_URL);
	if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Local video URL must use HTTP or HTTPS');
	return {
		enabled: (enabledSetting ?? env.LOCAL_VIDEO_ENABLED ?? 'false') === 'true',
		baseUrl: url.toString().replace(/\/$/, '')
	};
}

async function jsonRequest<T>(url: string, init?: RequestInit, timeoutMs = 30_000): Promise<T> {
	const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
	if (!response.ok) {
		const details = await response.text().catch(() => '');
		throw new Error(`Local video service request failed (${response.status}): ${details.slice(0, 300)}`);
	}
	return response.json() as Promise<T>;
}

function resolution(value?: string): string {
	if (value?.match(/^\d{3,4}x\d{3,4}$/)) return value;
	if (value === '720p') return '1280x720';
	return '832x480';
}

async function loadInputImage(imageUrl: string, userId: string): Promise<{ data: Buffer; mimeType: string; filename: string }> {
	const localMatch = imageUrl.match(/^\/api\/images\/([a-f0-9-]+)$/i);
	if (localMatch) {
		const [record] = await db.select().from(images).where(eq(images.id, localMatch[1]));
		if (!record || record.userId !== userId || !record.cloudPath) {
			throw new Error('The selected source image is not available');
		}
		return {
			data: await storageService.download(record.cloudPath),
			mimeType: record.mimeType,
			filename: record.filename
		};
	}

	const url = new URL(imageUrl);
	if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The source image URL is not supported');
	const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
	if (!response.ok) throw new Error(`Unable to retrieve the source image (${response.status})`);
	return {
		data: Buffer.from(await response.arrayBuffer()),
		mimeType: response.headers.get('content-type')?.split(';')[0] || 'image/png',
		filename: url.pathname.split('/').pop() || 'source-image.png'
	};
}

async function uploadInputImage(baseUrl: string, imageUrl: string, userId: string): Promise<string> {
	const image = await loadInputImage(imageUrl, userId);
	const form = new FormData();
	form.append('file', new Blob([new Uint8Array(image.data)], { type: image.mimeType }), image.filename);
	const uploaded = await jsonRequest<{ path?: string }>(`${baseUrl}/api/v1/upload`, {
		method: 'POST',
		body: form
	}, 2 * 60_000);
	if (!uploaded.path) throw new Error('The local video service did not accept the source image');
	return uploaded.path;
}

export async function generateLocalVideo(params: VideoGenerationParams): Promise<AIVideoResponse> {
	if (!params.userId) throw new Error('User ID is required for video generation');
	const config = await getLocalVideoConfig();
	if (!config.enabled) throw new Error('Local video provider is not enabled');

	const duration = Math.max(1, Math.min(12, params.duration ?? 5));
	const startImageUrl = params.imageUrl || params.imageStartUrl;
	const modelType = startImageUrl ? 'ltx2_22B_distilled_1_1' : 't2v_1.3B';
	const fps = startImageUrl ? 25 : 16;
	const videoLength = Math.max(17, Math.round(duration * fps));
	const [defaults, imageStart, imageEnd] = await Promise.all([
		jsonRequest<Record<string, unknown>>(`${config.baseUrl}/api/v1/defaults/${modelType}`),
		startImageUrl ? uploadInputImage(config.baseUrl, startImageUrl, params.userId) : Promise.resolve(undefined),
		params.imageEndUrl ? uploadInputImage(config.baseUrl, params.imageEndUrl, params.userId) : Promise.resolve(undefined)
	]);
	const submitted = await jsonRequest<{ job_id?: string }>(`${config.baseUrl}/api/v1/generate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			...defaults,
			model_type: modelType,
			generation_mode: 'video',
			prompt: [params.prompt, params.style].filter(Boolean).join(', '),
			negative_prompt: 'text, watermark, logo, distorted, low quality',
			resolution: startImageUrl ? '768x512' : resolution(params.resolution),
			video_length: videoLength,
			num_inference_steps: startImageUrl ? 8 : params.quality === 'high' ? 30 : params.quality === 'medium' ? 16 : 8,
			guidance_scale: 5,
			flow_shift: 5,
			sample_solver: 'unipc',
			seed: params.seed ?? -1,
			image_start: imageStart,
			image_end: imageEnd,
			image_prompt_type: imageStart ? (imageEnd ? 'SE' : 'S') : ''
		})
	});
	if (!submitted.job_id) throw new Error('Local video service did not return a job ID');

	let outputFile = '';
	const startedAt = Date.now();
	while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
		const status = await jsonRequest<{
			status?: string;
			message?: string;
			error?: string;
			output_files?: string[];
		}>(`${config.baseUrl}/api/v1/status/${encodeURIComponent(submitted.job_id)}`);
		if (status.status === 'completed') {
			outputFile = status.output_files?.[0] ?? '';
			break;
		}
		if (status.status === 'failed' || status.status === 'cancelled') {
			throw new Error(status.error || status.message || 'Local video generation failed');
		}
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	if (!outputFile) throw new Error('Local video generation did not produce a video');

	const filename = outputFile.replace(/\\/g, '/').split('/').pop()!;
	const response = await fetch(`${config.baseUrl}/api/v1/file/${encodeURIComponent(filename)}`, {
		signal: AbortSignal.timeout(5 * 60_000)
	});
	if (!response.ok) throw new Error(`Unable to download generated video (${response.status})`);
	const mimeType = response.headers.get('content-type')?.split(';')[0] || 'video/mp4';
	const videoId = await saveVideoAndGetId(
		Buffer.from(await response.arrayBuffer()).toString('base64'),
		mimeType,
		params.userId,
		params.chatId,
		duration,
		params.resolution || '480p',
		fps,
		false,
		{ prompt: params.prompt, model: 'qamuz-local-video', seed: params.seed, quality: params.quality, style: params.style }
	);

	return {
		videoId,
		mimeType,
		prompt: params.prompt,
		model: 'qamuz-local-video',
		duration,
		resolution: params.resolution || '480p',
		fps,
		hasAudio: false
	};
}
