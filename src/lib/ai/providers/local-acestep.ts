import type {
	AIMessage,
	AIProvider,
	AIResponse,
	AIStreamChunk,
	AIMusicResponse,
	MusicGenerationParams
} from '../types.js';
import { env } from '$env/dynamic/private';
import { adminSettingsService } from '$lib/server/admin-settings.js';

const DEFAULT_BASE_URL = 'http://localhost:42003';
const POLL_INTERVAL_MS = 2_000;
const GENERATION_TIMEOUT_MS = 15 * 60_000;

export interface LocalMusicConfig {
	enabled: boolean;
	baseUrl: string;
}

function normalizeBaseUrl(value: string): string {
	const url = new URL(value);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Local music provider URL must use HTTP or HTTPS');
	}
	return url.toString().replace(/\/$/, '');
}

export async function getLocalMusicConfig(): Promise<LocalMusicConfig> {
	const [enabledSetting, baseUrlSetting] = await Promise.all([
		adminSettingsService.getSetting('local_music_enabled').catch(() => null),
		adminSettingsService.getSetting('local_music_base_url').catch(() => null)
	]);
	const enabledValue = enabledSetting ?? env.LOCAL_MUSIC_ENABLED ?? 'false';
	const baseUrl = baseUrlSetting ?? env.LOCAL_MUSIC_BASE_URL ?? DEFAULT_BASE_URL;
	return {
		enabled: enabledValue === 'true',
		baseUrl: normalizeBaseUrl(baseUrl)
	};
}

async function requestJson<T>(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<T> {
	const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
	if (!response.ok) {
		const details = await response.text().catch(() => '');
		throw new Error(`Local music service request failed (${response.status}): ${details.slice(0, 300)}`);
	}
	return response.json() as Promise<T>;
}

async function generateMusic(params: MusicGenerationParams): Promise<AIMusicResponse> {
	const config = await getLocalMusicConfig();
	if (!config.enabled) throw new Error('Local music provider is not enabled');

	await requestJson(`${config.baseUrl}/health`);
	const auth = await requestJson<{ token?: string }>(`${config.baseUrl}/api/auth/auto`);
	if (!auth.token) throw new Error('Local music service did not provide an authentication token');

	const headers = {
		Authorization: `Bearer ${auth.token}`,
		'Content-Type': 'application/json'
	};
	const durationSeconds = Math.max(10, Math.min(480, Math.round((params.musicLengthMs ?? 30_000) / 1000)));
	const submitted = await requestJson<{ jobId?: string }>(`${config.baseUrl}/api/generate`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			customMode: false,
			songDescription: params.prompt,
			instrumental: params.forceInstrumental ?? false,
			duration: durationSeconds,
			batchSize: 1,
			audioFormat: 'mp3'
		})
	}, 30_000);
	if (!submitted.jobId) throw new Error('Local music service did not return a job ID');

	const startedAt = Date.now();
	let result: Record<string, unknown> | undefined;
	while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
		const status = await requestJson<{
			status?: string;
			stage?: string;
			error?: string;
			result?: Record<string, unknown>;
		}>(`${config.baseUrl}/api/generate/status/${encodeURIComponent(submitted.jobId)}`, { headers });

		if (status.status === 'completed' || status.status === 'succeeded') {
			result = status.result;
			break;
		}
		if (status.status === 'failed' || status.status === 'cancelled') {
			throw new Error(status.error || 'Local music generation failed');
		}
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	if (!result) throw new Error('Local music generation timed out');

	const audioUrls = result.audioUrls as string[] | undefined;
	if (!audioUrls?.[0]) throw new Error('Local music generation returned no audio');
	const audioUrl = new URL(audioUrls[0], `${config.baseUrl}/`).toString();
	const audioResponse = await fetch(audioUrl, { signal: AbortSignal.timeout(120_000) });
	if (!audioResponse.ok) throw new Error(`Unable to download generated audio (${audioResponse.status})`);
	const mimeType = audioResponse.headers.get('content-type')?.split(';')[0] || 'audio/mpeg';

	return {
		audioData: Buffer.from(await audioResponse.arrayBuffer()).toString('base64'),
		mimeType,
		prompt: params.prompt,
		model: 'qamuz-local-music',
		durationMs: Math.round(Number(result.duration ?? durationSeconds) * 1000),
		isInstrumental: params.forceInstrumental ?? false,
		lyrics: typeof result.lyrics === 'string' ? result.lyrics : undefined
	};
}

async function chat(_params: {
	model: string;
	messages: AIMessage[];
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
}): Promise<AIResponse | AsyncIterableIterator<AIStreamChunk>> {
	throw new Error('Local music provider only supports music generation');
}

export const localAceStepProvider: AIProvider = {
	name: 'Qamuz Local Music',
	models: [],
	chat,
	generateMusic
};
