import type {
    AIProvider,
    AIModelConfig,
    MusicGenerationParams,
    AIMusicResponse
} from '../types.js';
import { env } from '$env/dynamic/private';
import { createProviderError } from '../utils.js';
import { getMusicGptApiKey } from '$lib/server/settings-store.js';

const MUSICGPT_API_BASE = 'https://api.musicgpt.com/api/public/v1';

async function getApiKey(): Promise<string> {
    try {
        const dbKey = await getMusicGptApiKey();
        if (dbKey) return dbKey;
    } catch {
        // fall through to env
    }
    return (env as Record<string, string>)['MUSICGPT_API_KEY'] || '';
}

const MUSICGPT_MODELS: AIModelConfig[] = [
    {
        name: 'musicgpt-v1',
        displayName: 'MusicGPT V1',
        provider: 'MusicGPT',
        maxTokens: 0,
        supportsTextInput: true,
        supportsAudioGeneration: true,
        supportsStreaming: false
    }
];

export async function musicgptSubmitTask(params: {
    prompt: string;
    modelId?: string;
    forceInstrumental?: boolean;
    vocalGender?: string;
    outputLengthSec?: number;
    webhookUrl?: string;
    referenceAudioUrl?: string;
}): Promise<string> {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('MusicGPT API key is not configured');

    const body: Record<string, unknown> = {
        prompt: params.prompt,
        music_style: "pop",
        lyrics: "",
        make_instrumental: params.forceInstrumental ?? false,
        vocal_only: false,
        gender: params.vocalGender || "neutral",
        voice_id: "",
        output_length: params.outputLengthSec ?? 45
    };

    if (params.webhookUrl) body.webhook_url = params.webhookUrl;
    if (params.referenceAudioUrl) body.audio_url = params.referenceAudioUrl;

    const submitRes = await fetch(`${MUSICGPT_API_BASE}/MusicAI`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
        body: JSON.stringify(body)
    });

    if (!submitRes.ok) {
        let errorMessage = submitRes.statusText;
        try {
            const errorData = await submitRes.json();
            errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (e) {
            const textError = await submitRes.text();
            if (textError) errorMessage = textError;
        }
        throw createProviderError('MusicGPT', 'submit', new Error(errorMessage));
    }

    const submitData = await submitRes.json();
    const taskId = submitData.task_id;
    if (!taskId) throw createProviderError('MusicGPT', 'submit API', new Error('MusicGPT API returned a success response but no task_id was found.'));

    return taskId;
}

export interface MusicGptTrack {
    audioUrl: string;
    duration: number;
    title?: string;
    tags?: string;
    imageUrl?: string;
}

export async function musicgptCheckStatus(taskId: string): Promise<
    | { status: 'pending' }
    | { status: 'done'; track: MusicGptTrack }
    | { status: 'error'; errorMessage: string }
> {
    const apiKey = await getApiKey();
    if (!apiKey) throw new Error('MusicGPT API key not configured.');

    const res = await fetch(`${MUSICGPT_API_BASE}/byId?task_id=${taskId}&conversionType=MUSIC_AI`, {
        headers: { Authorization: apiKey },
    });

    if (!res.ok) throw createProviderError('MusicGPT', 'status check', new Error(res.status.toString()));

    const data = await res.json();
    if (data.conversion?.status === 'COMPLETED') {
        return {
            status: 'done',
            track: {
                audioUrl: data.conversion.conversion_path_1,
                duration: data.conversion.conversion_duration_1 || 120,
                title: '',
                imageUrl: data.conversion.album_cover_path
            }
        };
    }
    if (data.conversion?.status === 'FAILED') {
        return { status: 'error', errorMessage: 'MusicGPT generation failed' };
    }
    return { status: 'pending' };
}

export const musicgptProvider: AIProvider = {
    name: 'MusicGPT',
    models: MUSICGPT_MODELS,
    async chat(): Promise<any> {
        throw new Error('MusicGPT provider only supports music generation, not chat.');
    },
    async generateMusic(params: MusicGenerationParams): Promise<AIMusicResponse> {
        const webhookUrl = (env as Record<string, string>)['MUSICGPT_WEBHOOK_URL'];
        const requestedLengthSec = typeof params.musicLengthMs === 'number'
            ? Math.max(10, Math.min(120, Math.round(params.musicLengthMs / 1000)))
            : 45;
        const taskId = await musicgptSubmitTask({
            prompt: params.prompt,
            modelId: params.modelId,
            forceInstrumental: params.forceInstrumental,
            vocalGender: params.vocalGender,
            outputLengthSec: requestedLengthSec,
            webhookUrl,
            referenceAudioUrl: params.referenceAudioUrl
        });

        const MAX_WAIT = 600_000;
        const deadline = Date.now() + MAX_WAIT;
        let track: MusicGptTrack | undefined;

        while (Date.now() < deadline) {
            const result = await musicgptCheckStatus(taskId);
            if (result.status === 'done') { track = result.track; break; }
            if (result.status === 'error') throw createProviderError('MusicGPT', 'generation task', new Error(result.errorMessage));
            await new Promise((r) => setTimeout(r, 3_000));
        }

        if (!track) throw new Error('MusicGPT generation timed out after 10 minutes');

        const audioRes = await fetch(track.audioUrl);
        if (!audioRes.ok) throw new Error(`Failed to download MusicGPT audio: ${audioRes.status}`);
        const audioData = Buffer.from(await audioRes.arrayBuffer()).toString('base64');

        return {
            audioData,
            mimeType: 'audio/mpeg',
            prompt: params.prompt,
            model: params.modelId || 'musicgpt-v1',
            durationMs: Math.round((track.duration || 0) * 1000),
            isInstrumental: params.forceInstrumental ?? false,
            imageUrl: track.imageUrl,
            videoUrl: undefined,
            lyrics: params.prompt,
        };
    }
};