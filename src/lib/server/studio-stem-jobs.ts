/**
 * In-process async wrapper around the synchronous GenAudius stem separation,
 * exposing the job/polling contract the Studio expects:
 *   POST  -> 202 { jobId }
 *   GET ?jobId          -> { status, stems:[{index,name}], error? }
 *   GET ?jobId&stem=N   -> raw WAV bytes
 *
 * The heavy work runs in the background; results (stem storage paths) are kept
 * in a Map keyed by jobId. This is per-process state, which is fine for the
 * single PM2 instance the SaaS runs on. Jobs expire after a TTL to bound memory.
 */

import { randomUUID } from 'crypto';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { genAudiusClient } from '$lib/ai/providers/genaudius-client.js';
import { storageService } from '$lib/server/storage.js';

export type StemJobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface StemEntry {
	index: number;
	name: string;
	storagePath: string;
	mimeType: string;
}

interface StemJob {
	id: string;
	userId: string;
	musicId: string;
	status: StemJobStatus;
	stems: StemEntry[];
	error?: string;
	createdAt: number;
}

const JOB_TTL_MS = 30 * 60_000; // 30 minutes
const jobs = new Map<string, StemJob>();
/** Guard so the same music isn't separated twice concurrently for one user. */
const activeByOwner = new Map<string, string>(); // `${userId}:${musicId}` -> jobId

function sweep(): void {
	const now = Date.now();
	for (const [id, job] of jobs) {
		if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
	}
}

export function getStemJob(id: string, userId: string): StemJob | null {
	const job = jobs.get(id);
	if (!job || job.userId !== userId) return null;
	return job;
}

export async function getStemBytes(id: string, userId: string, stemIndex: number): Promise<{ bytes: Buffer; mimeType: string } | null> {
	const job = getStemJob(id, userId);
	if (!job) return null;
	const entry = job.stems.find((s) => s.index === stemIndex);
	if (!entry) return null;
	const bytes = await storageService.download(entry.storagePath);
	return { bytes, mimeType: entry.mimeType };
}

/**
 * Start a stem separation job. Returns an existing in-flight jobId if the same
 * (user, music) is already being processed (maps to HTTP 409 on the route).
 */
export async function startStemJob(userId: string, musicId: string, mode: string): Promise<{ jobId: string; reused: boolean }> {
	sweep();
	const ownerKey = `${userId}:${musicId}`;
	const existingId = activeByOwner.get(ownerKey);
	if (existingId) {
		const existing = jobs.get(existingId);
		if (existing && (existing.status === 'pending' || existing.status === 'running')) {
			return { jobId: existingId, reused: true };
		}
		activeByOwner.delete(ownerKey);
	}

	const [song] = await db
		.select({ id: music.id, cloudPath: music.cloudPath, mimeType: music.mimeType })
		.from(music)
		.where(and(eq(music.id, musicId), eq(music.userId, userId)))
		.limit(1);
	if (!song?.cloudPath) {
		throw new Error('Music not found');
	}

	const job: StemJob = {
		id: randomUUID(),
		userId,
		musicId,
		status: 'pending',
		stems: [],
		createdAt: Date.now()
	};
	jobs.set(job.id, job);
	activeByOwner.set(ownerKey, job.id);

	// Fire-and-forget background processing.
	void runStemJob(job, song.cloudPath, song.mimeType || 'audio/mpeg', mode).finally(() => {
		if (activeByOwner.get(ownerKey) === job.id) activeByOwner.delete(ownerKey);
	});

	return { jobId: job.id, reused: false };
}

async function runStemJob(job: StemJob, cloudPath: string, mimeType: string, mode: string): Promise<void> {
	try {
		job.status = 'running';
		const buffer = await storageService.download(cloudPath);
		const result = await genAudiusClient.separateStems({
			audioBase64: buffer.toString('base64'),
			mimeType,
			mode: mode || 'split_stem'
		});

		const stems: StemEntry[] = [];
		let index = 0;
		for (const stem of result.stems || []) {
			const uploaded = await storageService.upload(
				{
					buffer: Buffer.from(stem.audioBase64, 'base64'),
					mimeType: stem.mimeType || 'audio/wav',
					filename: `${job.musicId}-stem-${index}-${stem.name}.wav`
				},
				job.userId,
				'audio',
				'generated'
			);
			stems.push({
				index,
				name: stem.name,
				storagePath: uploaded.path,
				mimeType: stem.mimeType || 'audio/wav'
			});
			index += 1;
		}

		if (!stems.length) {
			job.status = 'failed';
			job.error = 'Stem separation returned no stems';
			return;
		}

		job.stems = stems;
		job.status = 'completed';
	} catch (error) {
		job.status = 'failed';
		job.error = error instanceof Error ? error.message : 'Stem separation failed';
	}
}
