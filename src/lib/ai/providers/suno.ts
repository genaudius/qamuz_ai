import type {
    AIProvider,
    AIModelConfig,
    AIResponse,
    AIStreamChunk,
    AIMessage,
    MusicGenerationParams,
    AIMusicResponse
} from '../types.js';
import { createProviderError } from '../utils.js';
import {
    getKieApiKey,
    getKieMusicStatus,
    resolveKieAudioUrl,
    submitKieMusic,
    type KieSunoModel,
    type KieSunoTrack
} from './kie-music.js';

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
    musicLengthMs?: number;
    vocalGender?: 'male' | 'female' | 'duet';
    negativeTags?: string;
    styleWeight?: number;
    weirdnessConstraint?: number;
    audioWeight?: number;
    personaId?: string;
    personaModel?: 'style_persona' | 'voice_persona';
}): Promise<string> {
    const sunoModel = (SUNO_MODEL_MAP[params.modelId || 'suno-v4.5'] ?? 'V4_5') as KieSunoModel;
    const callBackUrl = params.callBackUrl || 'https://placeholder.internal/suno-callback';
    const requestedDuration = params.musicLengthMs == null ? undefined : params.musicLengthMs / 1000;
    // Kie only supports exact duration in V5.5 custom mode. For a simple instrumental
    // prompt we can safely promote it to custom mode because no lyrics are reinterpreted.
    const customMode = params.customMode ?? Boolean(
        params.forceInstrumental && sunoModel === 'V5_5' && requestedDuration != null
    );
    const inferredStyle = customMode ? (params.style?.trim() || params.prompt.trim()) : undefined;
    const inferredTitle = customMode ? (params.title?.trim() || 'Generated Track') : undefined;

    if (params.referenceAudioUrl) {
        throw new Error('Reference audio requires a dedicated Kie upload/extend or upload/cover operation.');
    }

    return submitKieMusic({
        prompt: params.prompt,
        model: sunoModel,
        customMode,
        instrumental: params.forceInstrumental ?? false,
        callBackUrl,
        style: inferredStyle,
        title: inferredTitle,
        negativeTags: params.negativeTags,
        vocalGender: params.vocalGender === 'male' ? 'm' : params.vocalGender === 'female' ? 'f' : undefined,
        styleWeight: params.styleWeight,
        weirdnessConstraint: params.weirdnessConstraint,
        audioWeight: params.audioWeight,
        personaId: params.personaId,
        personaModel: params.personaModel,
        duration: customMode && sunoModel === 'V5_5' ? requestedDuration : undefined
    });
}

// ─── Public: check task status (called from frontend polling) ─────────────────
export async function sunoCheckStatus(taskId: string): Promise<
    | { status: 'pending' }
    | { status: 'done'; track: KieSunoTrack; tracks: KieSunoTrack[] }
    | { status: 'error'; errorMessage: string }
> {
    const apiKey = await getKieApiKey();
    if (!apiKey) throw new Error('Suno API key not configured.');

    const data = await getKieMusicStatus(taskId);
    switch (data.status) {
        case 'SUCCESS':
        case 'FIRST_SUCCESS': {
            const track = data.tracks[0];
            const audioUrl = resolveKieAudioUrl(track);

            if (!track || !audioUrl) {
                return { status: 'pending' };
            }

            return {
                status: 'done',
                track: {
                    ...track,
                    audioUrl,
                },
                tracks: data.tracks
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
    const apiKey = await getKieApiKey();
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
        musicLengthMs: params.musicLengthMs,
        vocalGender: params.vocalGender,
        negativeTags: params.negativeTags,
        styleWeight: params.styleWeight,
        weirdnessConstraint: params.weirdnessConstraint,
        audioWeight: params.audioWeight,
        personaId: params.personaId,
        personaModel: params.personaModel,
    });

    // Only used internally (e.g. legacy code paths) — polls until done
    const MAX_WAIT = 600_000;
    const deadline = Date.now() + MAX_WAIT;
    let track: KieSunoTrack | undefined;
    let tracks: KieSunoTrack[] = [];

    while (Date.now() < deadline) {
        const result = await sunoCheckStatus(taskId);
        if (result.status === 'done') { track = result.track; tracks = result.tracks; break; }
        if (result.status === 'error') throw createProviderError('Suno', 'generation task', new Error(result.errorMessage));
        await new Promise((r) => setTimeout(r, 3_000));
    }

    if (!track) throw new Error('Suno generation timed out after 10 minutes');

    const audioUrl = resolveKieAudioUrl(track);
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
        providerTaskId: taskId,
        variants: tracks.map((variant) => ({
            id: variant.id,
            audioUrl: resolveKieAudioUrl(variant)!,
            title: variant.title,
            durationMs: variant.duration == null ? undefined : Math.round(variant.duration * 1000),
            imageUrl: variant.imageUrl,
            videoUrl: variant.videoUrl
        }))
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
