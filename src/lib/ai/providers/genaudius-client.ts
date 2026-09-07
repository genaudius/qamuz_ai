import { getLocalMusicConfig } from '$lib/ai/providers/local-acestep.js';

async function requestJson<T>(url: string, init?: RequestInit, timeoutMs = 15_000): Promise<T> {
	const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
	if (!response.ok) {
		const details = await response.text().catch(() => '');
		throw new Error(`GenAudius request failed (${response.status}): ${details.slice(0, 280)}`);
	}
	return response.json() as Promise<T>;
}

async function withAuthHeaders(baseUrl: string): Promise<Record<string, string>> {
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

/** Shared GenAudius (:42003) client for catalog, mixing, health, prompt preview. */
export const genAudiusClient = {
	async isReady(): Promise<{ ready: boolean; baseUrl: string; reason?: string }> {
		const config = await getLocalMusicConfig();
		if (!config.enabled) return { ready: false, baseUrl: config.baseUrl, reason: 'disabled' };
		try {
			const health = await requestJson<{ status?: string; model_loaded?: boolean }>(
				`${config.baseUrl}/health`
			);
			const loaded = health.model_loaded !== false;
			return {
				ready: loaded,
				baseUrl: config.baseUrl,
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
		const config = await getLocalMusicConfig();
		const headers = await withAuthHeaders(config.baseUrl);
		return requestJson(`${config.baseUrl}/api/music-catalog`, { headers });
	},

	async voices(): Promise<unknown> {
		const config = await getLocalMusicConfig();
		const headers = await withAuthHeaders(config.baseUrl);
		return requestJson(`${config.baseUrl}/api/voices`, { headers });
	},

	async mixingTools(): Promise<unknown> {
		const config = await getLocalMusicConfig();
		const headers = await withAuthHeaders(config.baseUrl);
		return requestJson(`${config.baseUrl}/api/mixing-tools`, { headers });
	},

	async reverbSuggestion(input: {
		genre?: string;
		channel_role?: string;
		bpm?: number;
	}): Promise<unknown> {
		const config = await getLocalMusicConfig();
		const headers = await withAuthHeaders(config.baseUrl);
		const params = new URLSearchParams();
		if (input.genre) params.set('genre', input.genre);
		if (input.channel_role) params.set('channel_role', input.channel_role);
		if (input.bpm != null) params.set('bpm', String(input.bpm));
		return requestJson(`${config.baseUrl}/api/mixing-tools/reverb-suggestion?${params}`, {
			headers
		});
	},

	async promptPreview(body: Record<string, unknown>): Promise<unknown> {
		const config = await getLocalMusicConfig();
		const headers = await withAuthHeaders(config.baseUrl);
		return requestJson(`${config.baseUrl}/api/prompt/preview`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body)
		});
	}
};
