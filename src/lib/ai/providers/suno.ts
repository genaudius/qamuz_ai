import type {
    AIProvider,
    AIModelConfig,
    AIResponse,
    AIStreamChunk,
    AIMessage,
    MusicGenerationParams,
    AIMusicResponse
} from '../types.js';
import { env } from '$env/dynamic/private';
import { createProviderError } from '../utils.js';
import { getSunoApiKey } from '$lib/server/settings-store.js';

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
    return (env as Record<string, string>)['SUNO_API_KEY'] || '';
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
    audioUrl?: string;
    audio_url?: string;
    downloadUrl?: string;
    streamUrl?: string;
    url?: string;
    duration: number;
    title?: string;
    tags?: string;
    imageUrl?: string;
    videoUrl?: string;
    prompt?: string;
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

function resolveTrackAudioUrl(track?: SunoTrack): string | null {
    if (!track) {
        return null;
    }

    return track.audioUrl || track.audio_url || track.downloadUrl || track.streamUrl || track.url || null;
}

function isProviderCreditError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
        normalized.includes('credits insufficient') ||
        normalized.includes('insufficient credits') ||
        normalized.includes('balance isn\'t enough') ||
        normalized.includes('balance is not enough') ||
        normalized.includes('top up to continue')
    );
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
    referenceAudioUrl?: string;
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
    if (params.referenceAudioUrl) body.audio_url = params.referenceAudioUrl;

    const submitRes = await fetch(`${SUNO_API_BASE}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!submitRes.ok) {
        const err = (await submitRes.json().catch(() => ({}))) as { msg?: string };
        const message = err.msg || submitRes.statusText;
        if (isProviderCreditError(message)) {
            throw new Error('Suno account credits are insufficient. Please top up the Suno API account and try again.');
        }

        throw createProviderError('Suno', 'submit', new Error(message));
    }

    const submitJson = (await submitRes.json()) as { code: number; data?: { taskId?: string }; msg?: string };
    if (submitJson.code !== 200 || !submitJson.data?.taskId) {
        const submitMessage = submitJson.msg || 'No task ID returned';
        if (isProviderCreditError(submitMessage)) {
            throw new Error('Suno account credits are insufficient. Please top up the Suno API account and try again.');
        }

        throw createProviderError('Suno', 'submit API', new Error(submitJson.msg || 'No task ID returned'));
    }

    return submitJson.data.taskId;
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
            const track = data.response?.sunoData?.find((item) => resolveTrackAudioUrl(item));
            const audioUrl = resolveTrackAudioUrl(track);

            if (!track || !audioUrl) {
                return { status: 'pending' };
            }

            return {
                status: 'done',
                track: {
                    ...track,
                    audioUrl,
                }
            };
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
        referenceAudioUrl: params.referenceAudioUrl,
    });

    // Only used internally (e.g. legacy code paths) — polls until done
    const MAX_WAIT = 600_000;
    const deadline = Date.now() + MAX_WAIT;
    let track: SunoTrack | undefined;

    while (Date.now() < deadline) {
        const result = await sunoCheckStatus(taskId);
        if (result.status === 'done') { track = result.track; break; }
        if (result.status === 'error') throw createProviderError('Suno', 'generation task', new Error(result.errorMessage));
        await new Promise((r) => setTimeout(r, 3_000));
    }

    if (!track) throw new Error('Suno generation timed out after 10 minutes');

    const audioUrl = resolveTrackAudioUrl(track);
    if (!audioUrl) {
        throw new Error('No audio URL in response');
    }

    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`Failed to download Suno audio: ${audioRes.status}`);
    const audioData = Buffer.from(await audioRes.arrayBuffer()).toString('base64');

    return {
        audioData,
        mimeType: 'audio/mpeg',
        prompt: params.prompt,
        model: params.modelId || 'suno-v4.5',
        durationMs: Math.round((track.duration || 0) * 1000),
        isInstrumental: params.forceInstrumental ?? false,
        imageUrl: track.imageUrl,
        videoUrl: track.videoUrl,
        lyrics: track.prompt || params.prompt,
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