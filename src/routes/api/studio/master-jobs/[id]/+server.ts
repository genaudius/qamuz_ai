import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { masterJobs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { storageService } from '$lib/server/storage.js';
import { ensureMasterJobTable, sessionUser } from '$lib/server/master-jobs.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = await sessionUser(locals);
	if (!user) throw error(401, 'Authentication required');

	await ensureMasterJobTable();
	const [job] = await db.select().from(masterJobs).where(eq(masterJobs.id, params.id));
	if (!job) throw error(404, 'Master not found');
	if (job.userId !== user.id) throw error(403, 'Access denied');
	if (!job.cloudPath) throw error(404, 'Master file missing');

	if (job.storageLocation === 'r2') {
		const url = await storageService.getUrl(job.cloudPath);
		return new Response(null, {
			status: 302,
			headers: { Location: url, 'Cache-Control': 'private, max-age=120' }
		});
	}

	const data = await storageService.download(job.cloudPath);
	return new Response(new Uint8Array(data), {
		headers: {
			'Content-Type': job.mimeType || 'audio/wav',
			'Content-Disposition': `attachment; filename="${job.title.replace(/[^\w.-]+/g, '_')}.wav"`,
			'Cache-Control': 'private, max-age=3600'
		}
	});
};
