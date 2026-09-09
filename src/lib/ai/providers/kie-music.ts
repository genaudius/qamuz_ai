import { env } from '$env/dynamic/private';
import { getSunoApiKey } from '$lib/server/settings-store.js';

export const KIE_API_BASE = 'https://api.kie.ai/api/v1';

export const KIE_MUSIC_TOOLS = [
	'generate',
	'recovery-audio',
	'generate-voice',
	'extend',
	'sounds',
	'timestamped-lyrics',
	'check-voice',
	'generate-persona',
	'replace-section',
	'generate-lyrics',
	'boost-music-style',
	'cover-generate',
	'add-vocals',
	'separate-vocals',
	'generate-midi-from-audio',
	'mashup',
	'create-music-video',
	'upload-and-extend-audio',
	'upload-and-cover-audio',
	'add-instrumental',
	'convert-to-wav'
] as const;

export type KieMusicTool = (typeof KIE_MUSIC_TOOLS)[number];

export type KieSunoModel = 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5' | 'V5_5';

export interface KieGenerateMusicInput {
	prompt: string;
	model: KieSunoModel;
	customMode: boolean;
	instrumental: boolean;
	callBackUrl: string;
	style?: string;
	title?: string;
	negativeTags?: string;
	vocalGender?: 'm' | 'f';
	styleWeight?: number;
	weirdnessConstraint?: number;
	audioWeight?: number;
	personaId?: string;
	personaModel?: 'style_persona' | 'voice_persona';
	duration?: number;
}

export interface KieSunoTrack {
	id?: string;
	audioUrl?: string;
	audio_url?: string;
	downloadUrl?: string;
	streamUrl?: string;
	url?: string;
	duration?: number;
	title?: string;
	tags?: string;
	imageUrl?: string;
	videoUrl?: string;
	prompt?: string;
}

export type KieStemMode = 'separate_vocal' | 'split_stem' | 'split_stem_advanced';

export interface KieStem {
	id?: string;
	name: string;
	audioUrl: string;
	duration?: number;
	kind?: 'extract' | 'remove';
}

interface KieEnvelope<T> {
	code: number;
	msg?: string;
	data?: T;
}

export class KieApiError extends Error {
	constructor(
		message: string,
		readonly code?: number,
		readonly status?: number
	) {
		super(message);
		this.name = 'KieApiError';
	}
}

/**
 * Policy: Kie is Generate Music only (plus status poll).
 * Default ON — set KIE_MUSIC_GENERATE_ONLY=false to unlock legacy tools (not recommended).
 */
export function isKieGenerateOnly(): boolean {
	const raw = (env as Record<string, string>)['KIE_MUSIC_GENERATE_ONLY'];
	if (raw == null || raw === '') return true;
	return !['0', 'false', 'no', 'off'].includes(raw.trim().toLowerCase());
}

function assertKieGenerateOnlyPath(path: string): void {
	if (!isKieGenerateOnly()) return;
	const clean = path.split('?')[0];
	const allowed = clean === '/generate' || clean.startsWith('/generate/record-info');
	if (!allowed) {
		throw new KieApiError(
			`Kie is generate-only. Blocked ${clean}. Use GenAudius workers or OpenRouter for other tools.`,
			403,
			403
		);
	}
}

export function resolveKieAudioUrl(track?: KieSunoTrack): string | null {
	return track?.audioUrl || track?.audio_url || track?.downloadUrl || track?.streamUrl || track?.url || null;
}

function clampUnit(value: number | undefined): number | undefined {
	if (value == null || Number.isNaN(value)) return undefined;
	return Math.min(1, Math.max(0, value));
}

export function buildKieGenerateBody(input: KieGenerateMusicInput): Record<string, unknown> {
	const body: Record<string, unknown> = {
		prompt: input.prompt,
		customMode: input.customMode,
		instrumental: input.instrumental,
		model: input.model,
		callBackUrl: input.callBackUrl
	};

	if (input.customMode) {
		if (!input.style?.trim()) throw new Error('Suno custom mode requires a music style.');
		if (!input.title?.trim()) throw new Error('Suno custom mode requires a title.');
		body.style = input.style.trim();
		body.title = input.title.trim().slice(0, 80);
		if (input.negativeTags?.trim()) body.negativeTags = input.negativeTags.trim();
		if (input.vocalGender) body.vocalGender = input.vocalGender;
		if (input.personaId?.trim()) body.personaId = input.personaId.trim();
		if (input.personaModel) body.personaModel = input.personaModel;

		const styleWeight = clampUnit(input.styleWeight);
		const weirdnessConstraint = clampUnit(input.weirdnessConstraint);
		const audioWeight = clampUnit(input.audioWeight);
		if (styleWeight != null) body.styleWeight = styleWeight;
		if (weirdnessConstraint != null) body.weirdnessConstraint = weirdnessConstraint;
		if (audioWeight != null) body.audioWeight = audioWeight;

		if (input.duration != null) {
			if (input.model !== 'V5_5') throw new Error('Exact duration is only supported by Suno V5.5.');
			body.duration = Math.min(360, Math.max(10, Math.round(input.duration)));
		}
	}

	return body;
}

export async function getKieApiKey(): Promise<string> {
	try {
		const dbKey = await getSunoApiKey();
		if (dbKey) return dbKey;
	} catch {
		// Database settings may be unavailable during startup or isolated tests.
	}
	return (env as Record<string, string>)['SUNO_API_KEY'] || '';
}

function isCreditMessage(message: string): boolean {
	const normalized = message.toLowerCase();
	return normalized.includes('credits insufficient') || normalized.includes('insufficient credits') ||
		normalized.includes("balance isn't enough") || normalized.includes('balance is not enough') ||
		normalized.includes('top up to continue');
}

async function kieRequest<T>(path: string, init?: RequestInit): Promise<KieEnvelope<T>> {
	assertKieGenerateOnlyPath(path);
	const apiKey = await getKieApiKey();
	if (!apiKey) throw new KieApiError('Suno API key not configured. Add it in Admin → Settings → AI Models.');

	const response = await fetch(`${KIE_API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${apiKey}`,
			...(init?.body ? { 'Content-Type': 'application/json' } : {}),
			...init?.headers
		}
	});
	const payload = await response.json().catch(() => ({})) as KieEnvelope<T>;
	const message = payload.msg || response.statusText || `Kie API error ${response.status}`;
	if (!response.ok || (payload.code != null && payload.code !== 200 && payload.code !== 201)) {
		if (isCreditMessage(message)) {
			throw new KieApiError('Suno account credits are insufficient. Please top up the Suno API account and try again.', payload.code, response.status);
		}
		throw new KieApiError(message, payload.code, response.status);
	}
	return payload;
}

export async function submitKieMusic(input: KieGenerateMusicInput): Promise<string> {
	const payload = await kieRequest<any>('/generate', {
		method: 'POST',
		body: JSON.stringify(buildKieGenerateBody(input))
	});
	
	const rawData = payload.data;
	const dataObj = Array.isArray(rawData) ? rawData[0] : rawData;
	
	if (!dataObj?.taskId && !dataObj?.task_id) {
		console.error("[KIE] Submit failed, payload:", payload);
		throw new KieApiError('Kie did not return a generation task ID.', payload.code);
	}
	return dataObj.taskId || dataObj.task_id;
}

export async function getKieMusicStatus(taskId: string): Promise<{
	status: string;
	errorMessage?: string;
	tracks: KieSunoTrack[];
}> {
	const payload = await kieRequest<any>(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
	
	const rawData = payload.data;
	const dataObj = Array.isArray(rawData) ? rawData[0] : rawData;
	
	if (!dataObj) {
		console.warn(`[KIE] No data returned for taskId ${taskId}. Payload:`, payload);
		return { status: 'PENDING', tracks: [] };
	}

	const status = dataObj.status || 'PENDING';
	if (status === 'FAILED' || status === 'CREATE_TASK_FAILED' || status === 'GENERATE_AUDIO_FAILED') {
		console.error(`[KIE] Task ${taskId} failed. Status: ${status}, payload:`, payload);
	} else if (status === 'PENDING') {
		console.log(`[KIE] Task ${taskId} pending. payload:`, payload);
	}

	return {
		status,
		errorMessage: dataObj.errorMessage,
		tracks: (dataObj.response?.sunoData || dataObj.sunoData || []).filter((track: any) => Boolean(resolveKieAudioUrl(track)))
	};
}

export async function submitKieAudioRecovery(taskId: string, callBackUrl?: string): Promise<string> {
	const payload = await kieRequest<{ task_id?: string; taskId?: string }>('/suno/recovery', {
		method: 'POST',
		body: JSON.stringify({ task_id: taskId, ...(callBackUrl ? { call_back_url: callBackUrl } : {}) })
	});
	const recoveryTaskId = payload.data?.task_id || payload.data?.taskId;
	if (!recoveryTaskId) throw new KieApiError('Kie did not return a recovery task ID.', payload.code);
	return recoveryTaskId;
}

export async function getKieAudioRecoveryStatus(taskId: string): Promise<KieEnvelope<unknown>> {
	return kieRequest<unknown>(`/suno/recovery/record-info?task_id=${encodeURIComponent(taskId)}`);
}

export async function submitKieStemSeparation(input: {
	taskId?: string;
	audioId?: string;
	audioUrl?: string;
	type: KieStemMode;
	stemName?: string;
	callBackUrl: string;
}): Promise<string> {
	if (input.audioUrl && input.audioId) throw new Error('Use audioUrl or audioId, not both.');
	if (!input.audioUrl && (!input.taskId || !input.audioId)) {
		throw new Error('Stem separation requires audioUrl or the original taskId and audioId.');
	}
	if (input.type === 'split_stem_advanced' && !input.stemName?.trim()) {
		throw new Error('Advanced stem separation requires stemName.');
	}
	const payload = await kieRequest<{ taskId?: string }>('/vocal-removal/generate', {
		method: 'POST',
		body: JSON.stringify({
			...(input.audioUrl ? { audioUrl: input.audioUrl } : { taskId: input.taskId, audioId: input.audioId }),
			type: input.type,
			...(input.stemName ? { stemName: input.stemName } : {}),
			callBackUrl: input.callBackUrl
		})
	});
	if (!payload.data?.taskId) throw new KieApiError('Kie did not return a stem separation task ID.', payload.code);
	return payload.data.taskId;
}

/** Map Kie stem URL keys / group names → DAW track labels (Spanish). */
/** Display names aligned with Studio 1.0 `inferInstrument`. */
const STEM_LABELS: Record<string, string> = {
	vocal: 'Voz',
	vocals: 'Voz',
	backingvocals: 'Coro',
	backing_vocals: 'Coro',
	drums: 'Batería',
	bass: 'Bajo',
	guitar: 'Guitarra',
	piano: 'Piano / Teclado',
	keyboard: 'Piano / Teclado',
	keys: 'Piano / Teclado',
	strings: 'Cuerdas',
	brass: 'Metales',
	woodwinds: 'Vientos',
	percussion: 'Percusión',
	synth: 'Sintetizador',
	fx: 'FX',
	instrumental: 'Instrumental',
	other: 'Otros'
};

const SKIP_STEM_KEYS = new Set(['origin', 'originurl', 'id']);

function normalizeStemKey(raw: string): string {
	return raw
		.replace(/Url$/i, '')
		.replace(/_url$/i, '')
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.toLowerCase();
}

export function stemDisplayName(raw: string): string {
	const key = normalizeStemKey(raw);
	if (STEM_LABELS[key]) return STEM_LABELS[key];
	const folded = key.replace(/_/g, '');
	if (STEM_LABELS[folded]) return STEM_LABELS[folded];
	return raw
		.replace(/Url$/i, '')
		.replace(/_/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\b\w/g, (letter) => letter.toUpperCase())
		.trim() || 'Stem';
}

function pushStem(stems: KieStem[], stem: KieStem, seen: Set<string>) {
	const url = stem.audioUrl?.trim();
	if (!url) return;
	const label = stemDisplayName(stem.name);
	const dedupe = `${label.toLowerCase()}|${url}`;
	if (seen.has(dedupe)) return;
	// Prefer extract instruments; skip leftover "(Removed)" residuals.
	if (/\(removed\)/i.test(stem.name)) return;
	seen.add(dedupe);
	stems.push({ ...stem, name: label, audioUrl: url });
}

function collectUrlFieldStems(source: Record<string, unknown>, stems: KieStem[], seen: Set<string>) {
	for (const [key, value] of Object.entries(source)) {
		if (typeof value !== 'string' || !value.trim()) continue;
		const norm = normalizeStemKey(key);
		if (SKIP_STEM_KEYS.has(norm) || SKIP_STEM_KEYS.has(key.toLowerCase())) continue;
		if (!/(url|_url)$/i.test(key) && !key.endsWith('Url')) continue;
		pushStem(stems, { name: stemDisplayName(key), audioUrl: value }, seen);
	}
}

export async function getKieStemStatus(taskId: string): Promise<{
	status: 'pending' | 'done' | 'error';
	errorMessage?: string;
	stems: KieStem[];
}> {
	const payload = await kieRequest<{
		successFlag?: string;
		errorMessage?: string;
		response?: Record<string, unknown> & { originData?: unknown[]; vocal_separation_info?: Record<string, unknown> };
	}>(`/vocal-removal/record-info?taskId=${encodeURIComponent(taskId)}`);
	const flag = payload.data?.successFlag || 'PENDING';
	if (['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION'].includes(flag)) {
		return { status: 'error', errorMessage: payload.data?.errorMessage || flag, stems: [] };
	}
	if (flag !== 'SUCCESS') return { status: 'pending', stems: [] };

	const response = payload.data?.response || {};
	const stems: KieStem[] = [];
	const seen = new Set<string>();

	// Prefer canonical *Url fields (vocalUrl, drumsUrl, …) — real instrument audio.
	collectUrlFieldStems(response, stems, seen);
	const nestedInfo =
		(response.vocal_separation_info as Record<string, unknown> | undefined) ||
		(response.vocalSeparationInfo as Record<string, unknown> | undefined);
	if (nestedInfo) collectUrlFieldStems(nestedInfo, stems, seen);

	const originData = Array.isArray(response.originData) ? response.originData : [];
	for (const entry of originData as Array<Record<string, unknown>>) {
		for (const kind of ['extract', 'remove'] as const) {
			const nested = entry[kind] as Record<string, unknown> | undefined;
			if (nested && typeof nested.audio_url === 'string') {
				pushStem(
					stems,
					{
						id: typeof nested.id === 'string' ? nested.id : undefined,
						name: String(nested.stem_type_group_name || 'Stem'),
						audioUrl: nested.audio_url,
						duration: typeof nested.duration === 'number' ? nested.duration : undefined,
						kind
					},
					seen
				);
			}
		}
		if (typeof entry.audio_url === 'string') {
			pushStem(
				stems,
				{
					id: typeof entry.id === 'string' ? entry.id : undefined,
					name: String(entry.stem_type_group_name || 'Stem'),
					audioUrl: entry.audio_url,
					duration: typeof entry.duration === 'number' ? entry.duration : undefined
				},
				seen
			);
		}
	}

	return { status: 'done', stems };
}

export type KieAlignedWord = {
	word: string;
	success?: boolean;
	startS: number;
	endS: number;
	palign?: number;
};

/** Word-level vocal alignment for karaoke-accurate lyric sync. */
export async function getKieTimestampedLyrics(
	taskId: string,
	audioId: string
): Promise<{ alignedWords: KieAlignedWord[]; hootCer?: number }> {
	const payload = await kieRequest<{
		alignedWords?: KieAlignedWord[];
		hootCer?: number;
	}>('/generate/get-timestamped-lyrics', {
		method: 'POST',
		body: JSON.stringify({ taskId, audioId })
	});
	const alignedWords = Array.isArray(payload.data?.alignedWords) ? payload.data!.alignedWords : [];
	return {
		alignedWords: alignedWords.filter(
			(row) =>
				row &&
				typeof row.word === 'string' &&
				Number.isFinite(row.startS) &&
				Number.isFinite(row.endS)
		),
		hootCer: payload.data?.hootCer
	};
}

const PLACEHOLDER_CB = 'https://placeholder.internal/qamuz-kie-callback';

async function submitTaskId(path: string, body: Record<string, unknown>): Promise<string> {
	const payload = await kieRequest<{ taskId?: string; task_id?: string }>(path, {
		method: 'POST',
		body: JSON.stringify(body)
	});
	const taskId = payload.data?.taskId || payload.data?.task_id;
	if (!taskId) throw new KieApiError(`Kie ${path} did not return a task ID.`, payload.code);
	return taskId;
}

export async function submitKieExtend(input: {
	audioId: string;
	model?: KieSunoModel;
	defaultParamFlag?: boolean;
	prompt?: string;
	style?: string;
	title?: string;
	continueAt?: number;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/generate/extend', {
		audioId: input.audioId,
		model: input.model || 'V5',
		defaultParamFlag: input.defaultParamFlag ?? false,
		...(input.prompt ? { prompt: input.prompt } : {}),
		...(input.style ? { style: input.style } : {}),
		...(input.title ? { title: input.title } : {}),
		...(input.continueAt != null ? { continueAt: input.continueAt } : {}),
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieUploadCover(input: {
	uploadUrl: string;
	prompt?: string;
	style?: string;
	title?: string;
	customMode?: boolean;
	instrumental?: boolean;
	model?: KieSunoModel;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/generate/upload-cover', {
		uploadUrl: input.uploadUrl,
		customMode: input.customMode ?? true,
		instrumental: input.instrumental ?? false,
		model: input.model || 'V5',
		...(input.prompt ? { prompt: input.prompt } : {}),
		...(input.style ? { style: input.style } : {}),
		...(input.title ? { title: input.title } : {}),
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieAddVocals(input: {
	uploadUrl: string;
	prompt: string;
	title: string;
	style: string;
	negativeTags?: string;
	model?: KieSunoModel;
	vocalGender?: 'm' | 'f';
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/generate/add-vocals', {
		uploadUrl: input.uploadUrl,
		prompt: input.prompt,
		title: input.title,
		style: input.style,
		negativeTags: input.negativeTags || 'harsh noise, glitch',
		model: input.model || 'V5',
		...(input.vocalGender ? { vocalGender: input.vocalGender } : {}),
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieAddInstrumental(input: {
	uploadUrl: string;
	title: string;
	tags: string;
	negativeTags?: string;
	model?: KieSunoModel;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/generate/add-instrumental', {
		uploadUrl: input.uploadUrl,
		title: input.title,
		tags: input.tags,
		negativeTags: input.negativeTags || 'harsh noise',
		model: input.model || 'V5',
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieMashup(input: {
	uploadUrlList: [string, string];
	prompt?: string;
	style?: string;
	title?: string;
	customMode?: boolean;
	instrumental?: boolean;
	model?: KieSunoModel;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/generate/mashup', {
		uploadUrlList: input.uploadUrlList,
		customMode: input.customMode ?? true,
		instrumental: input.instrumental ?? false,
		model: input.model || 'V5',
		...(input.prompt ? { prompt: input.prompt } : {}),
		...(input.style ? { style: input.style } : {}),
		...(input.title ? { title: input.title } : {}),
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieReplaceSection(input: {
	taskId: string;
	audioId: string;
	prompt: string;
	tags?: string;
	title?: string;
	infillStartS: number;
	infillEndS: number;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/generate/replace-section', {
		taskId: input.taskId,
		audioId: input.audioId,
		prompt: input.prompt,
		...(input.tags ? { tags: input.tags } : {}),
		...(input.title ? { title: input.title } : {}),
		infillStartS: input.infillStartS,
		infillEndS: input.infillEndS,
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieGenerateLyrics(input: {
	prompt: string;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/lyrics', {
		prompt: input.prompt,
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieBoostStyle(content: string): Promise<string> {
	const payload = await kieRequest<{ result?: string }>('/style/generate', {
		method: 'POST',
		body: JSON.stringify({ content })
	});
	const result = payload.data?.result;
	if (!result) throw new KieApiError('Kie style boost returned empty.', payload.code);
	return result;
}

export async function submitKieConvertWav(input: {
	taskId: string;
	audioId: string;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/wav/generate', {
		taskId: input.taskId,
		audioId: input.audioId,
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}

export async function submitKieGenerateMidi(input: {
	taskId: string;
	audioId?: string;
	callBackUrl?: string;
}): Promise<string> {
	return submitTaskId('/midi/generate', {
		taskId: input.taskId,
		...(input.audioId ? { audioId: input.audioId } : {}),
		callBackUrl: input.callBackUrl || PLACEHOLDER_CB
	});
}
