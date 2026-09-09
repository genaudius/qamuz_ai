import { env } from '$env/dynamic/private';
import { getLocalMusicConfig } from '$lib/ai/providers/local-acestep.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:42003';

function normalizeBaseUrl(value: string): string {
	const url = new URL(value);
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('GenAudius URL must use HTTP or HTTPS');
	}
	return url.toString().replace(/\/$/, '');
}

function envUrl(name: string): string | undefined {
	const raw = (env as Record<string, string>)[name];
	if (!raw?.trim()) return undefined;
	try {
		return normalizeBaseUrl(raw.trim());
	} catch {
		return undefined;
	}
}

function isRunPodUrl(baseUrl: string): boolean {
	return new URL(baseUrl).hostname.endsWith('.api.runpod.ai');
}

function workerToken(baseUrl: string): string | undefined {
	const primary = envUrl('GENAUDIUS_PRIMARY_URL');
	const failover = envUrl('GENAUDIUS_FAILOVER_URL');
	if (primary === baseUrl) {
		return env.GENAUDIUS_PRIMARY_TOKEN || env.GENAUDIUS_API_TOKEN || undefined;
	}
	if (failover === baseUrl) {
		return env.GENAUDIUS_FAILOVER_TOKEN || env.GENAUDIUS_API_TOKEN || undefined;
	}
	return env.GENAUDIUS_API_TOKEN || undefined;
}

/** Ordered GenAudius worker URLs: primary (RunPod) then failover (Modal). */
export async function getGenAudiusWorkerUrls(): Promise<string[]> {
	const config = await getLocalMusicConfig();
	const urls: string[] = [];
	const primary = envUrl('GENAUDIUS_PRIMARY_URL') || config.baseUrl || DEFAULT_BASE_URL;
	const failover = envUrl('GENAUDIUS_FAILOVER_URL');
	for (const url of [primary, failover]) {
		if (url && !urls.includes(url)) urls.push(url);
	}
	return urls;
}

async function requestJson<T>(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<T> {
	const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
	if (!response.ok) {
		const details = await response.text().catch(() => '');
		throw new Error(`GenAudius request failed (${response.status}): ${details.slice(0, 280)}`);
	}
	return response.json() as Promise<T>;
}

async function withAuthHeaders(baseUrl: string): Promise<Record<string, string>> {
	const configuredToken = workerToken(baseUrl);
	if (configuredToken) {
		return { Authorization: `Bearer ${configuredToken}`, 'Content-Type': 'application/json' };
	}
	try {
		const auth = await requestJson<{ token?: string }>(`${baseUrl}/api/auth/auto`);
		if (auth.token) {
			return { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' };
		}
	} catch {
		// Local server may not require auth.
	}
	return { 'Content-Type': 'application/json' };
}

async function withFailover<T>(
	run: (baseUrl: string) => Promise<T>,
	timeoutMs = 15_000
): Promise<{ data: T; baseUrl: string }> {
	const urls = await getGenAudiusWorkerUrls();
	let lastError: unknown;
	for (const baseUrl of urls) {
		try {
			const data = await Promise.race([
				run(baseUrl),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error(`timeout ${timeoutMs}ms`)), timeoutMs)
				)
			]);
			return { data, baseUrl };
		} catch (error) {
			lastError = error;
			console.warn(`[genaudius] worker failed @ ${baseUrl}:`, error);
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error('All GenAudius workers failed');
}

async function postAudioTool<T>(
	path: string,
	body: Record<string, unknown>,
	timeoutMs = 180_000
): Promise<T> {
	const { data } = await withFailover(async (baseUrl) => {
		const headers = await withAuthHeaders(baseUrl);
		if (isRunPodUrl(baseUrl)) {
			const operationByPath: Record<string, string> = {
				'/api/convert/wav': 'convert_wav',
				'/api/align-lyrics': 'align_lyrics',
				'/api/stems': 'stems',
				'/api/midi': 'midi'
			};
			const response = await requestJson<{ output?: T; error?: string }>(
				`${baseUrl}/runsync`,
				{
					method: 'POST',
					headers,
					body: JSON.stringify({ input: { operation: operationByPath[path], ...body } })
				},
				timeoutMs
			);
			if (response.error || !response.output) {
				throw new Error(response.error || 'RunPod returned no output');
			}
			return response.output;
		}
		return requestJson<T>(`${baseUrl}${path}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		}, timeoutMs);
	}, timeoutMs);
	return data;
}

/** Shared GenAudius client — catalog, mixing, health, prompt preview, audio tools. */
export const genAudiusClient = {
	async isReady(): Promise<{ ready: boolean; baseUrl: string; reason?: string }> {
		const config = await getLocalMusicConfig();
		if (!config.enabled && !envUrl('GENAUDIUS_PRIMARY_URL')) {
			return { ready: false, baseUrl: config.baseUrl, reason: 'disabled' };
		}
		try {
			const { data, baseUrl } = await withFailover(async (url) => {
				return requestJson<{ status?: string; model_loaded?: boolean }>(`${url}/health`);
			});
			const loaded = data.model_loaded !== false;
			return {
				ready: loaded,
				baseUrl,
				reason: loaded ? undefined : 'model_loading'
			};
		} catch (error) {
			return {
				ready: false,
				baseUrl: config.baseUrl,
				reason: error instanceof Error ? error.message : String(error)
			};
		}
	},

	async musicCatalog(): Promise<unknown> {
		const { data } = await withFailover(async (baseUrl) => {
			const headers = await withAuthHeaders(baseUrl);
			return requestJson(`${baseUrl}/api/music-catalog`, { headers });
		});
		return data;
	},

	async voices(): Promise<unknown> {
		const { data } = await withFailover(async (baseUrl) => {
			const headers = await withAuthHeaders(baseUrl);
			return requestJson(`${baseUrl}/api/voices`, { headers });
		});
		return data;
	},

	async mixingTools(): Promise<unknown> {
		const { data } = await withFailover(async (baseUrl) => {
			const headers = await withAuthHeaders(baseUrl);
			return requestJson(`${baseUrl}/api/mixing-tools`, { headers });
		});
		return data;
	},

	async reverbSuggestion(input: {
		genre?: string;
		channel_role?: string;
		bpm?: number;
	}): Promise<unknown> {
		const { data } = await withFailover(async (baseUrl) => {
			const headers = await withAuthHeaders(baseUrl);
			const params = new URLSearchParams();
			if (input.genre) params.set('genre', input.genre);
			if (input.channel_role) params.set('channel_role', input.channel_role);
			if (input.bpm != null) params.set('bpm', String(input.bpm));
			return requestJson(`${baseUrl}/api/mixing-tools/reverb-suggestion?${params}`, {
				headers
			});
		});
		return data;
	},

	async promptPreview(body: Record<string, unknown>): Promise<unknown> {
		const { data } = await withFailover(async (baseUrl) => {
			const headers = await withAuthHeaders(baseUrl);
			return requestJson(`${baseUrl}/api/prompt/preview`, {
				method: 'POST',
				headers,
				body: JSON.stringify(body)
			});
		});
		return data;
	},

	async convertWav(input: { audioBase64: string; mimeType?: string }): Promise<{
		mimeType: string;
		filename: string;
		bytes: number;
		audioBase64: string;
	}> {
		return postAudioTool('/api/convert/wav', {
			audioBase64: input.audioBase64,
			mimeType: input.mimeType || 'audio/mpeg'
		});
	},

	async alignLyrics(input: {
		audioBase64: string;
		lyrics: string;
		mimeType?: string;
	}): Promise<{
		source: string;
		lines: Array<{ text: string; start: number; end?: number }>;
		durationSec?: number;
	}> {
		return postAudioTool('/api/align-lyrics', {
			audioBase64: input.audioBase64,
			lyrics: input.lyrics,
			mimeType: input.mimeType || 'audio/mpeg'
		});
	},

	async separateStems(input: {
		audioBase64: string;
		mimeType?: string;
		mode?: string;
	}): Promise<{
		source: string;
		stems: Array<{ name: string; mimeType: string; audioBase64: string; bytes: number }>;
	}> {
		return postAudioTool(
			'/api/stems',
			{
				audioBase64: input.audioBase64,
				mimeType: input.mimeType || 'audio/mpeg',
				mode: input.mode || 'separate_vocal'
			},
			300_000
		);
	},

	async audioToMidi(input: { audioBase64: string; mimeType?: string }): Promise<{
		source: string;
		mimeType: string;
		filename: string;
		bytes: number;
		audioBase64: string;
	}> {
		return postAudioTool(
			'/api/midi',
			{
				audioBase64: input.audioBase64,
				mimeType: input.mimeType || 'audio/mpeg'
			},
			300_000
		);
	}
};
