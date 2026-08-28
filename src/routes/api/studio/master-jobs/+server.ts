import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { masterJobs } from '$lib/server/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { storageService } from '$lib/server/storage.js';
import { randomUUID } from 'crypto';
import { isPremiumTier, sessionUser } from '$lib/server/master-jobs.js';

function serializeJob(job: typeof masterJobs.$inferSelect) {
	return {
		id: job.id,
		title: job.title,
		sourceName: job.sourceName,
		sourceKind: job.sourceKind,
		sourceMusicId: job.sourceMusicId,
		style: job.style,
		peakDb: job.peakDb,
		lufs: job.lufs,
		durationSec: job.durationSec,
		fileSize: job.fileSize,
		createdAt: job.createdAt,
		downloadPath: `/api/studio/master-jobs/${job.id}`
	};
}

export const GET: RequestHandler = async ({ locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		const rows = await db
			.select()
			.from(masterJobs)
			.where(eq(masterJobs.userId, user.id))
			.orderBy(desc(masterJobs.createdAt))
			.limit(80);
		return json({ jobs: rows.map(serializeJob) });
	} catch (error) {
		console.error('master-jobs list', error);
		return json({ jobs: [], error: 'History unavailable' }, { status: 200 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });
	if (!isPremiumTier(user.planTier)) {
		return json({ error: 'QAMUZ MASTER PRO requires Premium (Pro or Advanced)' }, { status: 403 });
	}

	try {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) {
			return json({ error: 'Audio file required' }, { status: 400 });
		}

		const bytes = Buffer.from(await file.arrayBuffer());
		const filename = `${randomUUID()}.wav`;
		const stored = await storageService.upload(
			{ buffer: bytes, mimeType: file.type || 'audio/wav', filename },
			user.id,
			'audio',
			'uploaded'
		);

		const [job] = await db
			.insert(masterJobs)
			.values({
				userId: user.id,
				title: String(form.get('title') || file.name || 'QAMUZ Master'),
				sourceName: String(form.get('sourceName') || file.name || 'upload'),
				sourceKind: String(form.get('sourceKind') || 'upload'),
				sourceMusicId: String(form.get('sourceMusicId') || '') || null,
				style: String(form.get('style') || ''),
				recipe: form.get('recipe') ? JSON.parse(String(form.get('recipe'))) : null,
				peakDb: Number(form.get('peakDb') || 0) || null,
				lufs: Number(form.get('lufs') || 0) || null,
				durationSec: Number(form.get('durationSec') || 0) || null,
				mimeType: file.type || 'audio/wav',
				fileSize: bytes.length,
				storageLocation: stored.storageLocation,
				cloudPath: stored.path
			})
			.returning();

		return json({ job: serializeJob(job) });
	} catch (error) {
		console.error('master-jobs create', error);
		return json({ error: (error as Error).message || 'Could not save master' }, { status: 500 });
	}
};
