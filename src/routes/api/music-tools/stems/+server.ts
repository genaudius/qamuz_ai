import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { aiJobs, music } from '$lib/server/db/schema.js';
import {
	getKieStemStatus,
	submitKieStemSeparation,
	stemDisplayName,
	type KieStemMode
} from '$lib/ai/providers/kie-music.js';
import { storageService } from '$lib/server/storage.js';

const MODES = new Set<KieStemMode>(['separate_vocal', 'split_stem', 'split_stem_advanced']);

async function ownedJob(jobId: string, userId: string) {
	const [job] = await db.select().from(aiJobs).where(and(eq(aiJobs.id, jobId), eq(aiJobs.userId, userId))).limit(1);
	return job;
}

/** Public/signed URL Kie can fetch when the track has no Suno task/audio IDs. */
async function resolveReachableAudioUrl(musicId: string, userId: string): Promise<string | undefined> {
	const [song] = await db
		.select({ cloudPath: music.cloudPath })
		.from(music)
		.where(and(eq(music.id, musicId), eq(music.userId, userId)))
		.limit(1);
	if (!song?.cloudPath) return undefined;
	try {
		const url = await storageService.getPublicUrl(song.cloudPath);
		if (url.startsWith('http://') || url.startsWith('https://')) return url;
	} catch {
		// Fall through.
	}
	return undefined;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const mode = (typeof body.type === 'string' ? body.type : 'split_stem') as KieStemMode;
		if (!MODES.has(mode)) return json({ error: 'Invalid stem separation mode' }, { status: 400 });

		let providerTaskId = typeof body.taskId === 'string' ? body.taskId : undefined;
		let audioId = typeof body.audioId === 'string' ? body.audioId : undefined;
		let audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl : undefined;
		const musicId = typeof body.musicId === 'string' ? body.musicId : undefined;

		if (musicId) {
			const [song] = await db
				.select({ id: music.id })
				.from(music)
				.where(and(eq(music.id, musicId), eq(music.userId, session.user.id)))
				.limit(1);
			if (!song) return json({ error: 'Music not found' }, { status: 404 });
			const jobs = await db
				.select({ result: aiJobs.result })
				.from(aiJobs)
				.where(
					and(
						eq(aiJobs.userId, session.user.id),
						eq(aiJobs.type, 'music-generation'),
						eq(aiJobs.status, 'completed')
					)
				)
				.orderBy(desc(aiJobs.completedAt));
			const source = jobs
				.map((item) => item.result as Record<string, unknown> | null)
				.find((result) => result?.musicId === musicId);
			providerTaskId =
				typeof source?.providerTaskId === 'string' ? source.providerTaskId : providerTaskId;
			const variants = Array.isArray(source?.variants)
				? (source.variants as Array<Record<string, unknown>>)
				: [];
			audioId = typeof variants[0]?.id === 'string' ? variants[0].id : audioId;
			if (!audioUrl && (!providerTaskId || !audioId)) {
				audioUrl = await resolveReachableAudioUrl(musicId, session.user.id);
			}
		}

		if (!audioUrl && (!providerTaskId || !audioId)) {
			return json(
				{
					error:
						'This track has no Kie source IDs and no public audio URL for stem separation.',
					code: 'kie_source_unavailable'
				},
				{ status: 409 }
			);
		}

		const kieTaskId = await submitKieStemSeparation({
			taskId: audioUrl ? undefined : providerTaskId,
			audioId: audioUrl ? undefined : audioId,
			audioUrl,
			type: mode,
			stemName: typeof body.stemName === 'string' ? body.stemName : undefined,
			callBackUrl: 'https://placeholder.internal/qamuz-kie-stems'
		});
		const [job] = await db
			.insert(aiJobs)
			.values({
				userId: session.user.id,
				type: 'stem-separation',
				status: 'processing',
				payload: { musicId, mode, stemName: body.stemName },
				result: { providerTaskId: kieTaskId }
			})
			.returning({ id: aiJobs.id });
		return json({ jobId: job.id, status: 'processing' }, { status: 202 });
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Stem separation failed' },
			{ status: 502 }
		);
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
	const jobId = url.searchParams.get('jobId');
	if (!jobId) return json({ error: 'jobId is required' }, { status: 400 });
	const job = await ownedJob(jobId, session.user.id);
	if (!job || job.type !== 'stem-separation') return json({ error: 'Stem job not found' }, { status: 404 });

	let result = job.result as {
		providerTaskId?: string;
		stems?: Array<{ name: string; audioUrl: string }>;
	} | null;
	if (job.status === 'processing' && result?.providerTaskId) {
		const state = await getKieStemStatus(result.providerTaskId);
		if (state.status === 'error') {
			await db
				.update(aiJobs)
				.set({ status: 'failed', errorMessage: state.errorMessage, completedAt: new Date() })
				.where(eq(aiJobs.id, job.id));
			return json({ jobId, status: 'failed', error: state.errorMessage });
		}
		if (state.status === 'done') {
			result = {
				...result,
				stems: state.stems.map((stem) => ({
					name: stemDisplayName(stem.name),
					audioUrl: stem.audioUrl
				}))
			};
			await db
				.update(aiJobs)
				.set({ status: 'completed', result, completedAt: new Date() })
				.where(eq(aiJobs.id, job.id));
			job.status = 'completed';
		}
	}

	const stemIndex = url.searchParams.get('stem');
	if (stemIndex != null) {
		if (job.status !== 'completed' && !result?.stems) {
			return json({ error: 'Stems are not ready' }, { status: 409 });
		}
		const stem = result?.stems?.[Number(stemIndex)];
		if (!stem?.audioUrl) return json({ error: 'Stem not found' }, { status: 404 });
		const upstream = await fetch(stem.audioUrl);
		if (!upstream.ok) {
			return json({ error: `Stem download failed (${upstream.status})` }, { status: 502 });
		}
		return new Response(await upstream.arrayBuffer(), {
			headers: {
				'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
				'Cache-Control': 'private, max-age=3600'
			}
		});
	}

	return json({
		jobId,
		status: result?.stems?.length ? 'completed' : job.status,
		error: job.errorMessage,
		stems:
			result?.stems?.map((stem, index) => ({
				index,
				name: stemDisplayName(stem.name)
			})) || []
	});
};
