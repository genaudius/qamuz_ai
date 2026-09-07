import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';

export interface SongForStems {
	id?: string;
	title?: string;
	prompt?: string;
	genre?: string;
	isInstrumental?: boolean;
	bpm?: number;
	imageUrl?: string | null;
}

type StudioSessionRow = {
	name?: string;
	title?: string;
	musicId?: string;
	audioFingerprint?: string;
};

const SESSIONS_KEY = 'qamuz.studio.sessions.v1';

function bpmFromPrompt(text: string | undefined): number | null {
	if (!text) return null;
	const match = text.match(/(\d{2,3})\s*bpm\b/i) || text.match(/\btempo[:\s]+(\d{2,3})\b/i);
	if (!match) return null;
	const bpm = Number(match[1]);
	if (bpm < 60 || bpm > 200) return null;
	return bpm;
}

export function songSessionTitle(song: SongForStems): string {
	const title = (song.title ?? '').trim();
	if (title && !/^generated track$/i.test(title)) return title.slice(0, 80);
	const prompt = (song.prompt ?? '').trim();
	const first = prompt.split(/[\n.!?]/)[0]?.trim() ?? '';
	return (first || title || 'Canción QAMUZ').slice(0, 80);
}

function readStudioSessions(): StudioSessionRow[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const parsed = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]') as StudioSessionRow[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/** Session already linked to this Create Music track in the DAW history. */
export function findStudioExportForSong(song: SongForStems): StudioSessionRow | null {
	if (!song.id) return null;
	const sessions = readStudioSessions();
	const byId = sessions.find((item) => item.musicId === song.id);
	if (byId) return byId;
	const title = songSessionTitle(song).toLocaleLowerCase('es');
	return (
		sessions.find((item) => {
			const name = (item.title || item.name || '').toLocaleLowerCase('es');
			return name === title && Boolean(item.musicId || item.audioFingerprint);
		}) ?? null
	);
}

export interface OpenStudioOptions {
	extractStems?: boolean;
	/** User confirmed creating a duplicate export. */
	forceNew?: boolean;
}

/** Open QAMUZ Studio 2.0 with the song mix. Optional stem split. */
export function openSongInStudio(song: SongForStems, options: OpenStudioOptions = {}): void {
	if (!song.id || song.id.startsWith('pending-')) {
		toast.error('La canción todavía se está generando.');
		return;
	}

	if (!options.forceNew) {
		const existing = findStudioExportForSong(song);
		if (existing) {
			const label = existing.title || existing.name || songSessionTitle(song);
			toast.warning(
				`“${label}” ya está exportada al DAW editor. Ábrela desde Studio → Sesiones, o crea una copia.`
			);
			const force = typeof window !== 'undefined'
				? window.confirm(
						`“${label}” ya está exportada al DAW editor.\n\n` +
							`Cancelar para no duplicar, o Aceptar para abrir Studio y crear una copia.`
					)
				: false;
			if (!force) return;
			options = { ...options, forceNew: true };
		}
	}

	const params = new URLSearchParams({
		musicId: song.id,
		session: songSessionTitle(song)
	});
	if (options.extractStems) params.set('extractStems', '1');
	if (options.forceNew) params.set('forceNew', '1');
	const idea = (song.prompt ?? song.title ?? '').trim().slice(0, 240);
	if (idea) params.set('idea', idea);
	if (song.genre) params.set('genre', song.genre);
	if (song.isInstrumental) params.set('instrumental', '1');
	const bpm = song.bpm ?? bpmFromPrompt(song.prompt ?? song.title);
	if (bpm) params.set('bpm', String(bpm));
	if (song.imageUrl) params.set('imageUrl', song.imageUrl);

	toast.message(
		options.extractStems
			? options.forceNew
				? 'Abriendo Studio (copia) y extrayendo stems…'
				: 'Abriendo Studio y extrayendo stems…'
			: options.forceNew
				? 'Abriendo una copia en Studio…'
				: 'Abriendo la canción en Studio…'
	);
	void goto(`/studio?${params.toString()}`);
}

/** Open QAMUZ Studio with the song mix; the DAW extracts instrument stems and names the session. */
export function openSongStemsInStudio(song: SongForStems): void {
	openSongInStudio(song, { extractStems: true });
}
