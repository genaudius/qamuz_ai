import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
	mapSttWordsToLyricLines,
	parseLyricSource,
	type TimedLyricLine
} from '$lib/utils/lyrics-sync.js';

type NodeAligner = {
	align: (
		waveform: Float32Array,
		transcript: string
	) => Promise<{
		words: Array<[number, number, string]>;
	}>;
};

let alignerPromise: Promise<NodeAligner> | null = null;

function envFlag(name: string, fallback = false): boolean {
	const raw = process.env[name];
	if (raw == null || raw === '') return fallback;
	return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/** Local ONNX forced-align is OFF by default — full songs OOM Node (~30GB+). Prefer GenAudius worker. */
export function isLocalForcedAlignEnabled(): boolean {
	return envFlag('LYRICS_LOCAL_ALIGN', false);
}

async function getEnglishAligner(): Promise<NodeAligner> {
	if (!alignerPromise) {
		alignerPromise = (async () => {
			const { createNodeAligner } = await import('charsiu-js');
			return createNodeAligner() as Promise<NodeAligner>;
		})();
	}
	return alignerPromise;
}

function transcriptFromLyrics(lyrics: string): string {
	return parseLyricSource(lyrics)
		.filter((row) => !row.boundary && row.text)
		.map((row) => row.text)
		.join(' ')
		.replace(/\s+/g, ' ')
		.trim();
}

async function decodeToMono16kWav(buffer: Buffer, mimeType: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'qamuz-align-'));
	const ext = mimeType.includes('wav')
		? 'wav'
		: mimeType.includes('ogg')
			? 'ogg'
			: mimeType.includes('flac')
				? 'flac'
				: mimeType.includes('m4a') || mimeType.includes('mp4')
					? 'm4a'
					: 'mp3';
	const inPath = join(dir, `in.${ext}`);
	const outPath = join(dir, 'out-16k.wav');
	await writeFile(inPath, buffer);

	await new Promise<void>((resolve, reject) => {
		const child = spawn(
			'ffmpeg',
			['-y', '-i', inPath, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', outPath],
			{ stdio: 'ignore' }
		);
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`ffmpeg 16k convert exited with code ${code}`));
		});
	});

	return outPath;
}

/**
 * Free on-server karaoke alignment via charsiu-js (wav2vec2 + DTW).
 * Best for English; other Latin scripts still get usable timings when lyrics
 * are known (forced align against the known text — not free speech-to-text).
 */
export async function alignLyricsWithLocalForcedAlign(opts: {
	buffer: Buffer;
	mimeType: string;
	lyrics: string;
}): Promise<TimedLyricLine[] | null> {
	if (!isLocalForcedAlignEnabled()) return null;
	const transcript = transcriptFromLyrics(opts.lyrics);
	if (!transcript) return null;

	let wavPath: string | null = null;
	try {
		wavPath = await decodeToMono16kWav(opts.buffer, opts.mimeType || 'audio/mpeg');
		const { loadWav16k } = await import('charsiu-js/assets-node');
		const waveform = loadWav16k(wavPath);
		const aligner = await getEnglishAligner();
		const { words } = await aligner.align(waveform, transcript);
		if (!Array.isArray(words) || words.length === 0) return null;

		const sttWords = words
			.filter((row) => Array.isArray(row) && row.length >= 3)
			.map(([start, end, text]) => ({
				text: String(text || '').trim(),
				start: Number(start),
				end: Number(end)
			}))
			.filter(
				(w) =>
					w.text &&
					w.text !== '[SIL]' &&
					Number.isFinite(w.start) &&
					Number.isFinite(w.end)
			);

		if (!sttWords.length) return null;
		const timed = mapSttWordsToLyricLines(opts.lyrics, sttWords);
		return timed.length ? timed : null;
	} finally {
		if (wavPath) {
			await rm(dirname(wavPath), { recursive: true, force: true }).catch(() => undefined);
		}
	}
}
