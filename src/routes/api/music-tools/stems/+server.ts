import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { qamuzV1Client } from '$lib/ai/providers/qamuz-v1-client.js';
import { storageService } from '$lib/server/storage.js';
import { sessionUser } from '$lib/server/master-jobs.js';
import { getStemBytes, getStemJob, startStemJob } from '$lib/server/studio-stem-jobs.js';

/**
 * Stem separation via Qamuz v1. QAMUZ PROD/MAESTRO owns intent; Qamuz v1 returns assets.
 *
 * Two contracts share this route:
 *  - Async (QAMUZ Studio DAW): POST { musicId, type: 'split_stem' } -> 202 { jobId };
 *    poll GET ?jobId -> { status, stems:[{index,name}] }; fetch GET ?jobId&stem=N -> WAV bytes.
 *  - Sync (legacy): POST { musicId, type?: 'separate_vocal' } -> { status:'completed', stems:[...] }.
 */

const ASYNC_MODES = new Set(['split_stem', 'split_stem_advanced']);

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	let body: Record<string, unknown> = {};
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		body = {};
	}

	const musicId = typeof body.musicId === 'string' ? body.musicId : undefined;
	if (!musicId) return json({ error: 'musicId is required' }, { status: 400 });

	const mode =
		typeof body.type === 'string'
			? body.type
			: typeof body.mode === 'string'
				? body.mode
				: 'separate_vocal';

	// --- Async job contract (Studio DAW) ---
	if (ASYNC_MODES.has(mode)) {
		try {
			const { jobId, reused } = await startStemJob(user.id, musicId, mode);
			if (reused) {
				// Another separation for this track is already running.
				return json({ jobId, status: 'running' }, { status: 409 });
			}
			return json({ jobId, status: 'pending' }, { status: 202 });
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Stem separation failed';
			const status = message.includes('not found') ? 404 : 502;
			return json({ error: message, code: 'genaudius_stems_failed' }, { status });
		}
	}

	// --- Legacy synchronous contract ---
	try {
		const [song] = await db
			.select({ id: music.id, cloudPath: music.cloudPath, mimeType: music.mimeType })
			.from(music)
			.where(and(eq(music.id, musicId), eq(music.userId, user.id)))
			.limit(1);
		if (!song?.cloudPath) return json({ error: 'Music not found' }, { status: 404 });

		const buffer = await storageService.download(song.cloudPath);
		const result = await qamuzV1Client.separateStems({
			audioBase64: buffer.toString('base64'),
			mimeType: song.mimeType || 'audio/mpeg',
			stems: mode === 'separate_vocal' ? ['vocals', 'other'] : ['vocals', 'drums', 'bass', 'other']
		});

		const stems = [];
		for (const stem of result.stems || []) {
			const uploaded = await storageService.upload(
				{
					buffer: Buffer.from(stem.audioBase64, 'base64'),
					mimeType: stem.mimeType || 'audio/wav',
					filename: `${musicId}-${stem.name}.wav`
				},
				user.id,
				'audio',
				'generated'
			);
			stems.push({
				name: stem.name,
				url: `/api/library/file?path=${encodeURIComponent(uploaded.path)}`,
				storagePath: uploaded.path,
				mimeType: stem.mimeType,
				bytes: stem.bytes
			});
		}

	return json({ source: 'qamuz_v1', status: 'completed', engine: result.source, stems });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Stem separation failed';
		const status = message.includes('not installed') ? 501 : 502;
		return json({ error: message, code: 'genaudius_stems_failed' }, { status });
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	const jobId = url.searchParams.get('jobId');
	if (!jobId) {
		return json({
			source: 'qamuz_v1',
			message: 'Stem jobs: POST { musicId, type: "split_stem" } then poll GET ?jobId.'
		});
	}

	const job = getStemJob(jobId, user.id);
	if (!job) return json({ error: 'Job not found' }, { status: 404 });

	// Fetch raw bytes for one stem: GET ?jobId&stem=N
	const stemParam = url.searchParams.get('stem');
	if (stemParam !== null) {
		const stemIndex = Number(stemParam);
		if (!Number.isInteger(stemIndex)) return json({ error: 'Invalid stem index' }, { status: 400 });
		const found = await getStemBytes(jobId, user.id, stemIndex);
		if (!found) return json({ error: 'Stem not found' }, { status: 404 });
		return new Response(new Uint8Array(found.bytes), {
			headers: { 'Content-Type': found.mimeType || 'audio/wav', 'Cache-Control': 'private, max-age=3600' }
		});
	}

	// Poll status
	return json({
		status: job.status,
		error: job.error,
		stems: job.stems.map((s) => ({ index: s.index, name: s.name }))
	});
};
