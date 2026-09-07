export type TimedLyricLine = {
	text: string;
	/** Start time in seconds. Always set after builders. */
	start: number;
	end?: number;
	/** True when the source had an explicit timestamp / vocal alignment. */
	timed: boolean;
	section?: string;
};

export type AlignedWord = {
	word: string;
	startS: number;
	endS: number;
	success?: boolean;
};

const LRC_LINE = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/;
const SECTION_TAG = /^\[([^\]]+)\]$/;

const SECTION_WEIGHT: Record<string, number> = {
	intro: 0.85,
	instrumental: 0.9,
	solo: 0.9,
	verse: 1.15,
	'pre-chorus': 0.85,
	prechorus: 0.85,
	chorus: 1.35,
	hook: 1.25,
	bridge: 1.0,
	breakdown: 0.9,
	outro: 1.05,
	ending: 1.05,
	end: 0.8
};

function normalizeSection(raw: string): string {
	return raw
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.replace(/\d+/g, '')
		.replace(/[:\-_/]+/g, ' ')
		.trim();
}

function sectionKey(label: string): string {
	const n = normalizeSection(label);
	for (const key of Object.keys(SECTION_WEIGHT)) {
		if (n === key || n.startsWith(key) || n.includes(key)) return key;
	}
	return 'verse';
}

function isSectionOnly(text: string): boolean {
	return SECTION_TAG.test(text.trim());
}

function parseSectionLabel(text: string): string | null {
	const match = text.trim().match(SECTION_TAG);
	return match ? match[1].trim() : null;
}

/**
 * Convert Kie/Suno alignedWords into line-level karaoke cues.
 * Words often embed newlines + [Verse]/[Chorus] markers.
 */
export function alignedWordsToTimedLines(words: AlignedWord[]): TimedLyricLine[] {
	const lines: TimedLyricLine[] = [];
	let currentText = '';
	let currentStart: number | null = null;
	let currentEnd = 0;
	let currentSection: string | undefined;

	const flush = () => {
		const text = currentText.trim();
		if (!text || currentStart == null) {
			currentText = '';
			currentStart = null;
			return;
		}
		lines.push({
			text,
			start: currentStart,
			end: currentEnd,
			timed: true,
			section: currentSection
		});
		currentText = '';
		currentStart = null;
	};

	for (const row of words) {
		if (row.success === false) continue;
		const chunks = String(row.word || '').split(/\r?\n/);
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i].trim();
			if (i > 0) flush();
			if (!chunk) continue;

			const section = parseSectionLabel(chunk);
			if (section && isSectionOnly(chunk)) {
				flush();
				currentSection = section;
				continue;
			}

			let body = chunk;
			const leading = chunk.match(/^\[([^\]]+)\]\s*(.*)$/);
			if (leading && leading[2] !== undefined) {
				currentSection = leading[1].trim();
				body = leading[2].trim();
				if (!body) continue;
			}

			if (currentStart == null) currentStart = row.startS;
			currentEnd = row.endS;
			currentText = currentText ? `${currentText} ${body}` : body;
		}
	}
	flush();
	return lines;
}

/**
 * Split raw lyrics into display lines, preserving LRC timestamps when present.
 * Empty structural markers ([Intro], [Instrumental], …) are kept as section boundaries.
 */
export function parseLyricSource(raw: string): Array<{
	text: string;
	start: number | null;
	section?: string;
	boundary?: boolean;
}> {
	const text = (raw || '').replace(/\r\n/g, '\n').trim();
	if (!text) return [];

	let currentSection: string | undefined;
	const rows: Array<{
		text: string;
		start: number | null;
		section?: string;
		boundary?: boolean;
	}> = [];

	for (const rawLine of text.split('\n')) {
		const line = rawLine.trim();
		if (!line) continue;

		const match = line.match(LRC_LINE);
		if (match) {
			const minutes = Number(match[1]);
			const seconds = Number(match[2]);
			const fracRaw = match[3] || '0';
			const frac =
				fracRaw.length <= 2 ? Number(fracRaw) / 100 : Number(fracRaw) / 1000;
			const body = (match[4] || '').trim();
			if (!body || isSectionOnly(body)) {
				const label = parseSectionLabel(body || '') || parseSectionLabel(line);
				if (label) {
					currentSection = label;
					rows.push({ text: '', start: null, section: label, boundary: true });
				}
				continue;
			}
			rows.push({
				text: body,
				start: minutes * 60 + seconds + (Number.isFinite(frac) ? frac : 0),
				section: currentSection
			});
			continue;
		}

		const label = parseSectionLabel(line);
		if (label && isSectionOnly(line)) {
			currentSection = label;
			rows.push({ text: '', start: null, section: label, boundary: true });
			continue;
		}

		const leading = line.match(/^\[([^\]]+)\]\s*(.+)$/);
		if (leading) currentSection = leading[1].trim();
		const cleaned = line.replace(/^\[[^\]]+\]\s*/, '').trim();
		if (!cleaned) continue;
		rows.push({ text: cleaned, start: null, section: currentSection });
	}

	const sung = rows.filter((r) => !r.boundary && r.text);
	// One giant paragraph → split into singable phrases so sync can move.
	if (sung.length === 1 && sung[0].start == null && sung[0].text.length > 72) {
		const phrases = sung[0].text
			.split(/(?<=[,.!?;:])\s+|\s+[—–-]\s+/)
			.map((part) => part.trim())
			.filter((part) => part.length > 0);
		if (phrases.length > 1) {
			const rebuilt: typeof rows = [];
			for (const row of rows) {
				if (row === sung[0]) {
					for (const part of phrases) {
						rebuilt.push({ text: part, start: null, section: row.section });
					}
				} else {
					rebuilt.push(row);
				}
			}
			return rebuilt;
		}
	}

	return rows;
}

type SectionBlock = {
	label: string;
	key: string;
	lines: Array<{ text: string; section?: string }>;
};

function groupIntoSections(
	parsed: Array<{ text: string; start: number | null; section?: string; boundary?: boolean }>
): SectionBlock[] {
	const blocks: SectionBlock[] = [];
	let current: SectionBlock | null = null;

	for (const row of parsed) {
		if (row.boundary && row.section) {
			current = {
				label: row.section,
				key: sectionKey(row.section),
				lines: []
			};
			blocks.push(current);
			continue;
		}
		const label = row.section || current?.label || 'Verse';
		const key = sectionKey(label);
		if (!current || current.label !== label) {
			current = { label, key, lines: [] };
			blocks.push(current);
		}
		if (row.text) current.lines.push({ text: row.text, section: label });
	}

	return blocks.filter((b) => b.lines.length > 0 || ['intro', 'instrumental', 'solo', 'outro', 'ending'].includes(b.key));
}

/**
 * Structure-aware timing when no vocal alignment exists.
 * Honors [Intro]/[Verse]/[Chorus]/[Bridge]/[Outro]/[Instrumental] so
 * vocals don't start at t=0 and choruses get more airtime.
 */
export function buildStructuredTimedLyrics(
	raw: string,
	durationSec: number
): TimedLyricLine[] {
	const parsed = parseLyricSource(raw);
	if (parsed.length === 0) return [];

	const duration = Number.isFinite(durationSec) && durationSec > 1 ? durationSec : 0;
	const sungRows = parsed.filter((line) => !line.boundary && line.text);
	if (sungRows.length === 0) return [];

	const hasTimestamps = sungRows.some((line) => line.start != null);
	if (hasTimestamps) {
		const known = sungRows
			.map((line, index) => ({ index, start: line.start }))
			.filter((row): row is { index: number; start: number } => row.start != null);

		return sungRows.map((line, index) => {
			if (line.start != null) {
				return {
					text: line.text,
					start: line.start,
					timed: true,
					section: line.section
				};
			}
			let prev = known[0];
			let next = known[known.length - 1];
			for (const row of known) {
				if (row.index <= index) prev = row;
				if (row.index >= index) {
					next = row;
					break;
				}
			}
			if (prev.index === next.index) {
				return {
					text: line.text,
					start: prev.start,
					timed: true,
					section: line.section
				};
			}
			const t = (index - prev.index) / Math.max(1, next.index - prev.index);
			return {
				text: line.text,
				start: prev.start + (next.start - prev.start) * t,
				timed: true,
				section: line.section
			};
		});
	}

	const blocks = groupIntoSections(parsed);
	const totalDur = duration > 0 ? duration : Math.max(sungRows.length * 3.2, 45);

	// Typical Suno song: pad before first sung word + soft outro trail.
	const hasIntro = blocks.some((b) => b.key === 'intro' || b.key === 'instrumental');
	const leadIn = hasIntro ? Math.min(4, totalDur * 0.03) : Math.min(11, Math.max(5.5, totalDur * 0.09));
	const trail = Math.min(8, totalDur * 0.05);
	const usable = Math.max(totalDur - leadIn - trail, sungRows.length * 1.4);

	const weights = blocks.map((block) => {
		const base = SECTION_WEIGHT[block.key] ?? 1;
		const lineFactor = Math.max(
			block.lines.length,
			block.key === 'intro' || block.key === 'instrumental' ? 1 : 0.5
		);
		if (block.lines.length === 0) return base * 0.85;
		return base * Math.sqrt(lineFactor);
	});
	const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

	const timed: TimedLyricLine[] = [];
	let cursor = leadIn;

	blocks.forEach((block, bi) => {
		const slice = (weights[bi] / weightSum) * usable;
		if (block.lines.length === 0) {
			cursor += slice;
			return;
		}

		const sungStartPad =
			block.key === 'intro' || block.key === 'instrumental'
				? slice * 0.55
				: block.key === 'outro'
					? slice * 0.08
					: slice * 0.04;
		const sungEndPad =
			block.key === 'outro' || block.key === 'ending' ? slice * 0.35 : slice * 0.08;
		const singSpan = Math.max(slice - sungStartPad - sungEndPad, block.lines.length * 0.9);
		const sectionStart = cursor + sungStartPad;

		block.lines.forEach((line, li) => {
			const t = (li + 0.12) / Math.max(block.lines.length, 1);
			const start = sectionStart + t * singSpan;
			const end =
				li < block.lines.length - 1
					? sectionStart + ((li + 1.12) / block.lines.length) * singSpan
					: cursor + slice - sungEndPad * 0.4;
			timed.push({
				text: line.text,
				start,
				end,
				timed: false,
				section: block.label
			});
		});

		cursor += slice;
	});

	return timed;
}

/** @deprecated use buildStructuredTimedLyrics */
export function buildTimedLyrics(raw: string, durationSec: number): TimedLyricLine[] {
	return buildStructuredTimedLyrics(raw, durationSec);
}

/** Active lyric index for a playhead time (seconds). */
export function activeLyricIndex(lines: TimedLyricLine[], timeSec: number): number {
	if (lines.length === 0) return -1;
	const t = Number.isFinite(timeSec) ? timeSec : 0;

	// Before first sung word → no active lyric (intro / instrumental).
	if (t < lines[0].start - 0.05) return -1;

	let lo = 0;
	let hi = lines.length - 1;
	let best = 0;
	while (lo <= hi) {
		const mid = (lo + hi) >> 1;
		if (lines[mid].start <= t) {
			best = mid;
			lo = mid + 1;
		} else {
			hi = mid - 1;
		}
	}

	const line = lines[best];
	if (line.end != null && t > line.end + 0.35 && best < lines.length - 1) {
		// Between lines (short instrumental break) — keep last until next is close,
		// unless gap is large.
		const next = lines[best + 1];
		if (next && t < next.start - 0.4) {
			return best;
		}
	}
	return best;
}

function normalizeAlignToken(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[^a-z0-9']/g, '')
		.trim();
}

function tokenSimilarity(a: string, b: string): number {
	if (!a || !b) return 0;
	if (a === b) return 1;
	if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return 0.88;
	const maxLen = Math.max(a.length, b.length);
	if (maxLen === 0) return 0;
	// Levenshtein (bounded)
	const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
	for (let i = 0; i <= a.length; i++) dp[i][0] = i;
	for (let j = 0; j <= b.length; j++) dp[0][j] = j;
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
		}
	}
	return 1 - dp[a.length][b.length] / maxLen;
}

/**
 * Map STT word timestamps onto known lyric lines (provider-agnostic karaoke).
 * Works for GenAudius local, MusicGPT, Suno, or any audio+lyrics pair.
 */
export function mapSttWordsToLyricLines(
	lyrics: string,
	sttWords: Array<{ text: string; start: number; end: number }>
): TimedLyricLine[] {
	const sung = parseLyricSource(lyrics).filter((row) => !row.boundary && row.text);
	const words = sttWords
		.map((w) => ({
			raw: w.text || '',
			norm: normalizeAlignToken(w.text || ''),
			start: w.start,
			end: w.end
		}))
		.filter(
			(w) =>
				w.norm.length > 0 &&
				!['music', 'applause', 'laughter', 'silence', 'instrumental'].includes(w.norm) &&
				Number.isFinite(w.start) &&
				Number.isFinite(w.end)
		);

	if (sung.length === 0) {
		return groupSttWordsIntoLines(words.map((w) => ({ text: w.raw, start: w.start, end: w.end })));
	}
	if (words.length === 0) return [];

	type Match = { start: number; end: number; hit: boolean };
	const lineMatches: Match[] = sung.map(() => ({ start: 0, end: 0, hit: false }));
	let cursor = 0;

	for (let li = 0; li < sung.length; li++) {
		const tokens = sung[li].text
			.split(/\s+/)
			.map(normalizeAlignToken)
			.filter((t) => t.length > 0);
		if (tokens.length === 0) continue;

		let firstStart: number | null = null;
		let lastEnd: number | null = null;
		let matched = 0;

		for (const token of tokens) {
			let bestIdx = -1;
			let bestScore = 0;
			const searchEnd = Math.min(words.length, cursor + 18);
			for (let wi = cursor; wi < searchEnd; wi++) {
				const score = tokenSimilarity(token, words[wi].norm);
				if (score > bestScore) {
					bestScore = score;
					bestIdx = wi;
				}
				// Prefer early strong matches
				if (score >= 0.96) break;
			}
			if (bestIdx < 0 || bestScore < 0.62) {
				// Allow skipping filler STT words once
				if (cursor < words.length) cursor += 1;
				continue;
			}
			const hit = words[bestIdx];
			if (firstStart == null) firstStart = hit.start;
			lastEnd = hit.end;
			cursor = bestIdx + 1;
			matched += 1;
		}

		if (matched > 0 && firstStart != null && lastEnd != null) {
			lineMatches[li] = { start: firstStart, end: lastEnd, hit: true };
		}
	}

	// Interpolate gaps between matched lines
	const timed: TimedLyricLine[] = [];
	for (let i = 0; i < sung.length; i++) {
		if (lineMatches[i].hit) {
			timed.push({
				text: sung[i].text,
				start: lineMatches[i].start,
				end: lineMatches[i].end,
				timed: true,
				section: sung[i].section
			});
			continue;
		}

		let prev = i - 1;
		while (prev >= 0 && !lineMatches[prev].hit) prev--;
		let next = i + 1;
		while (next < sung.length && !lineMatches[next].hit) next++;

		let start: number;
		let end: number;
		if (prev >= 0 && next < sung.length) {
			const span = Math.max(0.4, lineMatches[next].start - lineMatches[prev].end);
			const steps = next - prev;
			const step = span / steps;
			start = lineMatches[prev].end + step * (i - prev - 0.15);
			end = start + step * 0.85;
		} else if (prev >= 0) {
			start = lineMatches[prev].end + 0.35 * (i - prev);
			end = start + 1.8;
		} else if (next < sung.length) {
			start = Math.max(0, lineMatches[next].start - 0.9 * (next - i));
			end = start + 1.6;
		} else if (words.length) {
			const t0 = words[0].start;
			const t1 = words[words.length - 1].end;
			const ratio = (i + 0.2) / sung.length;
			start = t0 + (t1 - t0) * ratio;
			end = start + Math.max(1.2, (t1 - t0) / sung.length);
		} else {
			continue;
		}

		timed.push({
			text: sung[i].text,
			start,
			end,
			timed: true,
			section: sung[i].section
		});
	}

	return timed.sort((a, b) => a.start - b.start);
}

/** When no official lyrics exist, build lines from STT pauses. */
export function groupSttWordsIntoLines(
	sttWords: Array<{ text: string; start: number; end: number }>,
	gapSec = 0.42
): TimedLyricLine[] {
	if (!sttWords.length) return [];
	const lines: TimedLyricLine[] = [];
	let buf: typeof sttWords = [];

	const flush = () => {
		if (!buf.length) return;
		lines.push({
			text: buf.map((w) => w.text).join(' ').replace(/\s+/g, ' ').trim(),
			start: buf[0].start,
			end: buf[buf.length - 1].end,
			timed: true
		});
		buf = [];
	};

	for (let i = 0; i < sttWords.length; i++) {
		const word = sttWords[i];
		if (!buf.length) {
			buf.push(word);
			continue;
		}
		const prev = buf[buf.length - 1];
		const gap = word.start - prev.end;
		const longLine = buf.map((w) => w.text).join(' ').length > 42;
		if (gap >= gapSec || longLine) flush();
		buf.push(word);
	}
	flush();
	return lines.filter((l) => l.text.length > 0);
}
