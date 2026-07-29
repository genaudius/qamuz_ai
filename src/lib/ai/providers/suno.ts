import type {
	AIProvider,
	AIModelConfig,
	AIResponse,
	AIStreamChunk,
	AIMessage,
	MusicGenerationParams,
	AIMusicResponse
} from '../types';
const env = process.env;
import { createProviderError } from '../utils';
import { getSunoApiKey } from '@/src/lib/server/settings-store';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

// Maps our internal model IDs to Suno API model parameter values
const SUNO_MODEL_MAP: Record<string, string> = {
	'suno-v3.5': 'V3_5',
	'suno-v4': 'V4',
	'suno-v4.5': 'V4_5',
	'suno-v4.5-plus': 'V4_5PLUS',
	'suno-v4.5-all': 'V4_5ALL',
	'suno-v5': 'V5',
	'suno-v5.5': 'V5_5',
	'suno-v7.5': 'V5_5',
};

async function getApiKey(): Promise<string> {
	try {
		const dbKey = await getSunoApiKey();
		if (dbKey) return dbKey;
	} catch {
		// fall through to env
	}
	const envKeys = [
		'KIE_SUNO_API_KEY',
		'SUNO_API_KEY',
		'KIE_API_KEY',
		'KIE_AI_API_KEY',
		'SUNO_KEY',
		'KIE_SUNO_KEY',
		'KIE_KEY',
		'API_KEY',
		'KIE_SECRET',
		'SUNO_SECRET',
		'KIE_SUNO_SECRET',
		'SUNO_TOKEN',
		'KIE_TOKEN',
		'SECRET_KEY'
	];
	for (const key of envKeys) {
		const val = (env as Record<string, string>)[key];
		if (val && val.trim().length > 0) return val.trim();
	}
	return '';
}

const SUNO_MUSIC_MODELS: AIModelConfig[] = [
	{
		name: 'suno-v3.5',
		displayName: 'Suno V3.5',
		provider: 'Suno',
		maxTokens: 0,
		supportsTextInput: true,
		supportsAudioGeneration: true,
		supportsStreaming: false
	},
	{
		name: 'suno-v4',
		displayName: 'Suno V4',
		provider: 'Suno',
		maxTokens: 0,
		supportsTextInput: true,
		supportsAudioGeneration: true,
		supportsStreaming: false
	},
	{
		name: 'suno-v4.5',
		displayName: 'Suno V4.5',
		provider: 'Suno',
		maxTokens: 0,
		supportsTextInput: true,
		supportsAudioGeneration: true,
		supportsStreaming: false
	},
	{
		name: 'suno-v4.5-plus',
		displayName: 'Suno V4.5 Plus',
		provider: 'Suno',
		maxTokens: 0,
		supportsTextInput: true,
		supportsAudioGeneration: true,
		supportsStreaming: false
	},
	{
		name: 'suno-v4.5-all',
		displayName: 'Suno V4.5 All',
		provider: 'Suno',
		maxTokens: 0,
		supportsTextInput: true,
		supportsAudioGeneration: true,
		supportsStreaming: false
	},
	{
		name: 'suno-v5',
		displayName: 'Suno V5',
		provider: 'Suno',
		maxTokens: 0,
		supportsTextInput: true,
		supportsAudioGeneration: true,
		supportsStreaming: false
	},
	{
		name: 'suno-v5.5',
		displayName: 'Suno V5.5',
		provider: 'Suno',
		maxTokens: 0,
		supportsTextInput: true,
		supportsAudioGeneration: true,
		supportsStreaming: false
	}
];

interface SunoTrack {
	audioUrl: string;
	duration: number;
	title?: string;
	tags?: string;
	imageUrl?: string;
}

interface SunoStatusResponse {
	data: {
		status: string;
		errorMessage?: string;
		response?: {
			sunoData?: SunoTrack[];
		};
	};
}

// ─── Public: submit task, return taskId immediately ───────────────────────────
export async function sunoSubmitTask(params: {
	prompt: string;
	modelId?: string;
	forceInstrumental?: boolean;
	customMode?: boolean;
	style?: string;
	title?: string;
	callBackUrl?: string;
}): Promise<string> {
	const apiKey = await getApiKey();
	if (!apiKey) throw new Error('Suno API key not configured. Add it in Admin → Settings → AI Models.');

	const sunoModel = SUNO_MODEL_MAP[params.modelId || 'suno-v4.5'] ?? 'V4_5';
	const callBackUrl = params.callBackUrl || 'https://placeholder.internal/suno-callback';

	const body: Record<string, unknown> = {
		prompt: params.prompt,
		customMode: params.customMode ?? false,
		instrumental: params.forceInstrumental ?? false,
		model: sunoModel,
		callBackUrl,
	};

	if (params.customMode && params.style) body.style = params.style;
	if (params.customMode && params.title) body.title = params.title;

	const endpoints = [
		`${SUNO_API_BASE}/generate`,
		'https://api.kie.ai/v1/suno/generate',
		'https://api.kie.ai/v1/generate',
		'https://api.kie.ai/api/v1/suno/generate',
		'https://api.kie.ai/generate'
	];

	let lastError: any = null;

	for (const endpoint of endpoints) {
		try {
			const submitRes = await fetch(endpoint, {
				method: 'POST',
				headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});

			if (!submitRes.ok) {
				const err = (await submitRes.json().catch(() => ({}))) as { msg?: string };
				lastError = new Error(err.msg || submitRes.statusText);
				continue; // try next endpoint
			}

			const submitJson = (await submitRes.json()) as { code: number; data?: { taskId?: string }; msg?: string };
			if (submitJson.code !== 200 || !submitJson.data?.taskId) {
				lastError = new Error(submitJson.msg || 'No task ID returned');
				continue; // try next endpoint
			}

			return submitJson.data.taskId;
		} catch (error) {
			lastError = error;
		}
	}

	throw createProviderError('Suno', 'submit', lastError || new Error('All Suno API endpoints failed.'));
}

// ─── Public: check task status (called from frontend polling) ─────────────────
export async function sunoCheckStatus(taskId: string): Promise<
	| { status: 'pending' }
	| { status: 'done'; track: SunoTrack }
	| { status: 'error'; errorMessage: string }
> {
	const apiKey = await getApiKey();
	if (!apiKey) throw new Error('Suno API key not configured.');

	const res = await fetch(`${SUNO_API_BASE}/generate/record-info?taskId=${taskId}`, {
		headers: { Authorization: `Bearer ${apiKey}` },
	});

	if (!res.ok) throw createProviderError('Suno', 'status check', new Error(res.status.toString()));

	const { data } = (await res.json()) as SunoStatusResponse;

	switch (data.status) {
		case 'SUCCESS':
		case 'FIRST_SUCCESS': {
			const track = data.response?.sunoData?.[0];
			if (!track?.audioUrl) return { status: 'error', errorMessage: 'No audio URL in response' };
			return { status: 'done', track };
		}
		case 'CREATE_TASK_FAILED':
		case 'GENERATE_AUDIO_FAILED':
		case 'CALLBACK_EXCEPTION':
		case 'SENSITIVE_WORD_ERROR':
			return { status: 'error', errorMessage: data.errorMessage || data.status };
		default:
			return { status: 'pending' };
	}
}

async function generateMusic(params: MusicGenerationParams): Promise<AIMusicResponse> {
	const apiKey = await getApiKey();
	if (!apiKey) throw new Error('Suno API key not configured. Add it in Admin → Settings → AI Models.');

	const taskId = await sunoSubmitTask({
		prompt: params.prompt,
		modelId: params.modelId,
		forceInstrumental: params.forceInstrumental,
		customMode: params.customMode,
		style: params.style,
		title: params.title,
		callBackUrl: params.callBackUrl,
	});

	// Only used internally (e.g. legacy code paths) — polls until done
	const MAX_WAIT = 600_000;
	const deadline = Date.now() + MAX_WAIT;
	let track: SunoTrack | undefined;

	while (Date.now() < deadline) {
		const result = await sunoCheckStatus(taskId);
		if (result.status === 'done') { track = result.track; break; }
		if (result.status === 'error') throw createProviderError('Suno', 'generation task', new Error(result.errorMessage));
		await new Promise((r) => setTimeout(r, 10_000));
	}

	if (!track) throw new Error('Suno generation timed out after 10 minutes');

	const audioRes = await fetch(track.audioUrl);
	if (!audioRes.ok) throw new Error(`Failed to download Suno audio: ${audioRes.status}`);
	const audioData = Buffer.from(await audioRes.arrayBuffer()).toString('base64');

	return {
		audioData,
		mimeType: 'audio/mpeg',
		prompt: params.prompt,
		model: params.modelId || 'suno-v4.5',
		durationMs: Math.round((track.duration || 0) * 1000),
		isInstrumental: params.forceInstrumental ?? false,
	};
}

async function chat(_params: {
	model: string;
	messages: AIMessage[];
	maxTokens?: number;
	temperature?: number;
	stream?: boolean;
}): Promise<AIResponse | AsyncIterableIterator<AIStreamChunk>> {
	throw new Error('Suno provider does not support text chat. Use OpenRouter instead.');
}

export const sunoProvider: AIProvider = {
	name: 'Suno',
	models: SUNO_MUSIC_MODELS,
	chat,
	generateMusic
};
