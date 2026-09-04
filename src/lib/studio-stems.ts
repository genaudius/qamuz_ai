import { goto } from '$app/navigation';
import { toast } from 'svelte-sonner';

export interface SongForStems {
	id?: string;
	title?: string;
	prompt?: string;
	genre?: string;
	isInstrumental?: boolean;
	bpm?: number;
}

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

export interface OpenStudioOptions {
	extractStems?: boolean;
}

/** Open QAMUZ Studio 2.0 with the song mix. Optional stem split. */
export function openSongInStudio(song: SongForStems, options: OpenStudioOptions = {}): void {
	if (!song.id || song.id.startsWith('pending-')) {
		toast.error('La canción todavía se está generando.');
		return;
	}

	const params = new URLSearchParams({
		musicId: song.id,
		session: songSessionTitle(song)
	});
	if (options.extractStems) params.set('extractStems', '1');
	const idea = (song.prompt ?? song.title ?? '').trim().slice(0, 240);
	if (idea) params.set('idea', idea);
	if (song.genre) params.set('genre', song.genre);
	if (song.isInstrumental) params.set('instrumental', '1');
	const bpm = song.bpm ?? bpmFromPrompt(song.prompt ?? song.title);
	if (bpm) params.set('bpm', String(bpm));

	toast.message(options.extractStems ? 'Abriendo Studio y extrayendo stems…' : 'Abriendo la canción en Studio…');
	void goto(`/studio?${params.toString()}`);
}

/** Open QAMUZ Studio with the song mix; the DAW extracts instrument stems and names the session. */
export function openSongStemsInStudio(song: SongForStems): void {
	openSongInStudio(song, { extractStems: true });
}
