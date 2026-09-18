import {
	activeLyricIndex,
	buildStructuredTimedLyrics,
	type TimedLyricLine
} from '$lib/utils/lyrics-sync.js';
import type { GlobalMusicState, MusicTrack } from '$lib/stores/music.svelte.js';

export type AlignedSource =
	| 'pending'
	| 'local'
	| 'kie'
	| 'cached'
	| 'stt'
	| 'fallback'
	| 'none';

type EngineOptions = {
	/** Reactive getter for the currently playing track. */
	getTrack: () => MusicTrack | null | undefined;
	/** Reactive getter for the current playhead position (seconds). */
	getPlayhead: () => number;
	/** Reactive getter for the resolved track duration (seconds). */
	getDuration: () => number;
	/** Shared global music state used to persist aligned timings back onto the track. */
	musicState: GlobalMusicState;
};

/**
 * Shared lyric synchronization engine for the karaoke / now-playing / mobile-stage views.
 *
 * Every consuming component previously duplicated the same `timedLines`, `activeLine`,
 * `activeSection` derivations plus an identical `loadAlignedLyrics` fetch. This centralizes
 * that logic while leaving each view in control of its own playhead loop and layout math
 * (viewportCenter / LINE_STEP differ per surface).
 */
export function createLyricsEngine(options: EngineOptions) {
	const { getTrack, getPlayhead, getDuration, musicState } = options;

	let alignedLines = $state<TimedLyricLine[] | null>(null);
	let alignedSource = $state<AlignedSource>('pending');

	const timedLines = $derived.by((): TimedLyricLine[] => {
		if (alignedLines && alignedLines.length > 0) return alignedLines;
		const track = getTrack();
		if (track?.timedLyrics?.length) {
			return track.timedLyrics.map((line) => ({
				text: line.text,
				start: line.start,
				end: line.end,
				timed: true,
				section: line.section
			}));
		}
		return buildStructuredTimedLyrics(track?.lyrics || '', getDuration());
	});

	const activeLine = $derived(activeLyricIndex(timedLines, getPlayhead()));
	const activeSection = $derived(
		activeLine >= 0 ? timedLines[activeLine]?.section : timedLines[0]?.section
	);

	/**
	 * Vertical offset (px) that keeps the active line centered in a translated
	 * `.lyrics-engine` element. Each surface passes its own centering constants.
	 */
	function lyricsEngineY(viewportCenter: number, lineStep: number): number {
		const focus = activeLine < 0 ? 0 : activeLine;
		return viewportCenter - (focus * lineStep + lineStep * 0.5);
	}

	/** Fetch provider-agnostic aligned lyrics and cache them back onto the track. */
	async function loadAlignedLyrics(id: string): Promise<void> {
		alignedSource = 'pending';
		alignedLines = null;
		try {
			const response = await fetch(`/api/music/${id}/aligned-lyrics`);
			const payload = await response.json().catch(() => null);
			const lines = Array.isArray(payload?.lines) ? payload.lines : [];
			if (lines.length > 0) {
				alignedLines = lines.map(
					(line: { text: string; start: number; end?: number; section?: string }) => ({
						text: line.text,
						start: Number(line.start) || 0,
						end: line.end != null ? Number(line.end) : undefined,
						timed: true,
						section: line.section
					})
				);
				const src = String(payload?.source || '');
				if (src === 'cached') alignedSource = 'cached';
				else if (src === 'local') alignedSource = 'local';
				else if (src === 'kie') alignedSource = 'kie';
				else if (src === 'stt') alignedSource = 'stt';
				else if (src === 'structure') alignedSource = 'fallback';
				else alignedSource = alignedLines?.[0]?.timed ? 'local' : 'fallback';

				if (musicState.currentTrack?.id === id && alignedLines) {
					musicState.currentTrack = {
						...musicState.currentTrack,
						timedLyrics: alignedLines.map((l) => ({
							text: l.text,
							start: l.start,
							end: l.end,
							section: l.section
						}))
					};
				}
				return;
			}
		} catch {
			// Fall through to structure-aware timing.
		}
		alignedSource = getTrack()?.lyrics ? 'fallback' : 'none';
	}

	return {
		get timedLines() {
			return timedLines;
		},
		get activeLine() {
			return activeLine;
		},
		get activeSection() {
			return activeSection;
		},
		get alignedSource() {
			return alignedSource;
		},
		lyricsEngineY,
		loadAlignedLyrics
	};
}
