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
            const ready = data.tracks.filter((track) => Boolean(resolveKieAudioUrl(track)));
            // Kie/Suno bills two clips per generate. Do not finish on FIRST_SUCCESS
            // with only one ready URL — keep polling until the sibling appears.
            if (data.status === 'FIRST_SUCCESS' && ready.length < 2) {
                return { status: 'pending' };
            }
            if (!ready.length) {
                return { status: 'pending' };
            }

            const track = ready[0];
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
                tracks: ready
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

async function downloadTrackAudio(track: KieSunoTrack): Promise<{
    audioData: string;
    mimeType: string;
    audioUrl: string;
    track: KieSunoTrack;
}> {
    const audioUrl = resolveKieAudioUrl(track);
    if (!audioUrl) throw new Error('No audio URL in Suno track');
    const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(120_000) });
    if (!audioRes.ok) throw new Error(`Failed to download Suno audio: ${audioRes.status}`);
    const contentType = audioRes.headers.get('content-type') || 'audio/mpeg';
    const audioData = Buffer.from(await audioRes.arrayBuffer()).toString('base64');
    return { audioData, mimeType: contentType.includes('wav') ? 'audio/wav' : 'audio/mpeg', audioUrl, track };
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

    const MAX_WAIT = 600_000;
    const POLL_MS = 1_000;
    const SECOND_TRACK_GRACE_MS = 90_000;
    const deadline = Date.now() + MAX_WAIT;
    let tracks: KieSunoTrack[] = [];
    let firstReadyAt: number | null = null;

    while (Date.now() < deadline) {
        const data = await getKieMusicStatus(taskId);
        if (
            data.status === 'CREATE_TASK_FAILED' ||
            data.status === 'GENERATE_AUDIO_FAILED' ||
            data.status === 'CALLBACK_EXCEPTION' ||
            data.status === 'SENSITIVE_WORD_ERROR'
        ) {
            throw createProviderError('Suno', 'generation task', new Error(data.errorMessage || data.status));
        }

        const ready = data.tracks.filter((track) => Boolean(resolveKieAudioUrl(track)));
        if (ready.length >= 1 && firstReadyAt == null) {
            firstReadyAt = Date.now();
        }

        // Prefer both Kie clips (normal Suno generate = 2 songs billed).
        if (ready.length >= 2) {
            tracks = ready.slice(0, 2);
            break;
        }

        // Safety: if the second clip never appears, keep the first rather than hanging.
        if (firstReadyAt != null && Date.now() - firstReadyAt >= SECOND_TRACK_GRACE_MS && ready.length >= 1) {
            console.warn(`[Suno] Only ${ready.length} clip(s) ready after grace; continuing with what Kie returned.`);
            tracks = ready;
            break;
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
    }

    if (!tracks.length) throw new Error('Suno generation timed out after 10 minutes');

    const downloaded = await Promise.all(tracks.map((track) => downloadTrackAudio(track)));
    const primary = downloaded[0];

    return {
        audioData: primary.audioData,
        mimeType: primary.mimeType,
        prompt: params.prompt,
        model: params.modelId || 'suno-v4.5',
        durationMs: Math.round((primary.track.duration || 0) * 1000),
        isInstrumental: params.forceInstrumental ?? false,
        imageUrl: primary.track.imageUrl,
        videoUrl: primary.track.videoUrl,
        lyrics: primary.track.prompt || params.prompt,
        providerTaskId: taskId,
        variants: downloaded.map((item, index) => ({
            id: item.track.id || `${taskId}-${index + 1}`,
            audioUrl: item.audioUrl,
            audioData: item.audioData,
            mimeType: item.mimeType,
            title: item.track.title || (index === 0 ? 'Generated Track' : `Generated Track ${index + 1}`),
            durationMs: item.track.duration == null ? undefined : Math.round(item.track.duration * 1000),
            imageUrl: item.track.imageUrl,
            videoUrl: item.track.videoUrl,
            lyrics: item.track.prompt || params.prompt
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
