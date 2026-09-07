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

const DEFAULT_BASE_URL = 'http://127.0.0.1:42003';
const POLL_INTERVAL_MS = 2_000;
const GENERATION_TIMEOUT_MS = 15 * 60_000;

const GENRE_ALIASES: Record<string, string> = {
	bachata: 'bachata',
	merengue: 'merengue',
	salsa: 'salsa',
	bolero: 'bolero',
	cumbia: 'cumbia',
	reggae: 'reggae',
	jazz: 'jazz',
	blues: 'blues',
	pop: 'pop',
	rock: 'rock',
	'hip hop': 'hip_hop',
	'hip-hop': 'hip_hop',
	'r&b': 'r_and_b',
	rnb: 'r_and_b',
	electronic: 'electronic',
	classical: 'classical',
	country: 'country'
};

function inferGenre(prompt: string, style?: string): string | undefined {
	const haystack = `${style ?? ''} ${prompt}`.toLowerCase();
	for (const [needle, genre] of Object.entries(GENRE_ALIASES)) {
		if (haystack.includes(needle)) return genre;
	}
	return undefined;
}

function inferStyle(prompt: string, style?: string): string | undefined {
	if (style?.trim()) return style.trim();
	const folded = prompt.toLowerCase();
	if (folded.includes('bachata romantica') || folded.includes('bachata romántica')) return 'bachata romantica';
	if (folded.includes('bachata')) return 'bachata romantica';
	if (folded.includes('merengue bachata')) return 'merengue bachata';
	if (folded.includes('merengue')) return 'merengue tradicional';
	return undefined;
}

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

async function ensureAuthToken(baseUrl: string): Promise<string | null> {
	try {
		const auth = await requestJson<{ token?: string }>(`${baseUrl}/api/auth/auto`);
		if (auth.token) return auth.token;
	} catch {
		// Optional on GenAudius local runtime.
	}
	try {
		const setup = await requestJson<{ token?: string }>(`${baseUrl}/api/auth/setup`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: 'qamuz' })
		});
		if (setup.token) return setup.token;
	} catch {
		// GenAudius qamuz_server may not implement /api/auth/setup.
	}
	return null;
}

function isTerminalSuccess(status?: string): boolean {
	return status === 'completed' || status === 'succeeded' || status === 'success';
}

function isTerminalFailure(status?: string): boolean {
	return status === 'failed' || status === 'cancelled';
}

async function generateMusic(params: MusicGenerationParams): Promise<AIMusicResponse> {
	const config = await getLocalMusicConfig();
	if (!config.enabled) throw new Error('Local music provider is not enabled');

	const health = await requestJson<{ status?: string; model_loaded?: boolean }>(
		`${config.baseUrl}/health`
	).catch(() => ({ status: 'ok', model_loaded: true }));
	if (health.model_loaded === false) {
		throw new Error('GenAudius is still loading the music model. Try again in a minute.');
	}

	const token = await ensureAuthToken(config.baseUrl);
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {})
	};
	const durationSeconds = Math.max(15, Math.min(240, Math.round((params.musicLengthMs ?? 210_000) / 1000)));
	const genre = inferGenre(params.prompt, params.style);
	const style = inferStyle(params.prompt, params.style);
	const instrumental = params.forceInstrumental ?? false;
	const body = {
		songDescription: params.prompt.trim(),
		genre: genre ?? 'latin',
		style: style ?? genre?.replace('_', ' ') ?? 'modern pop',
		title: params.title?.trim() || 'GenAudius Track',
		lyrics: params.lyrics?.trim() || undefined,
		instrumental,
		vocalType: params.vocalGender === 'female' ? 'female' : params.vocalGender === 'duet' ? 'duet' : 'male',
		duration: durationSeconds,
		batchSize: 1,
		audioFormat: String(params.outputFormat || '').toLowerCase().includes('wav') ? 'wav' : 'mp3',
		vocalLanguage: 'es'
	};
	const submitted = await requestJson<{ jobId?: string }>(`${config.baseUrl}/api/generate`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body)
	}, 30_000);
	if (!submitted.jobId) throw new Error('GenAudius did not return a job ID');

	const startedAt = Date.now();
	let result: Record<string, unknown> | undefined;
	while (Date.now() - startedAt < GENERATION_TIMEOUT_MS) {
		const status = await requestJson<{
			status?: string;
			stage?: string;
			error?: string;
			result?: Record<string, unknown>;
		}>(`${config.baseUrl}/api/generate/status/${encodeURIComponent(submitted.jobId)}`, { headers });

		if (isTerminalSuccess(status.status)) {
			result = status.result;
			break;
		}
		if (isTerminalFailure(status.status)) {
			throw new Error(status.error || 'GenAudius generation failed');
		}
		await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
	}
	if (!result) throw new Error('GenAudius generation timed out');

	const audioUrls = result.audioUrls as string[] | undefined;
	if (!audioUrls?.[0]) throw new Error('GenAudius returned no audio');
	const audioUrl = new URL(audioUrls[0], `${config.baseUrl}/`).toString();
	const audioResponse = await fetch(audioUrl, { signal: AbortSignal.timeout(120_000) });
	if (!audioResponse.ok) throw new Error(`Unable to download generated audio (${audioResponse.status})`);
	const mimeType = audioResponse.headers.get('content-type')?.split(';')[0] || 'audio/mpeg';
	const coverUrl = typeof result.coverUrl === 'string'
		? result.coverUrl
		: typeof result.cover_url === 'string'
			? result.cover_url
			: undefined;

	return {
		audioData: Buffer.from(await audioResponse.arrayBuffer()).toString('base64'),
		mimeType,
		prompt: params.prompt,
		model: 'genaudius-ace-step',
		durationMs: Math.round(Number(result.duration ?? durationSeconds) * 1000),
		isInstrumental: params.forceInstrumental ?? false,
		lyrics: typeof result.lyrics === 'string' ? result.lyrics : params.lyrics,
		imageUrl: coverUrl && !coverUrl.startsWith('http://pollinations') ? new URL(coverUrl, `${config.baseUrl}/`).toString() : undefined
	};
}

async function chat(_params: {
	model: string;
	messages: AIMessage[];
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
}): Promise<AIResponse | AsyncIterableIterator<AIStreamChunk>> {
	throw new Error('GenAudius provider only supports music generation');
}

export const localAceStepProvider: AIProvider = {
	name: 'GenAudius Local Music',
	models: [],
	chat,
	generateMusic
};
