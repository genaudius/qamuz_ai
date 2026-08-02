import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { aiJobs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Authentication required');
	}

	const jobId = params.jobId;
	if (!jobId) {
		throw error(400, 'Job ID is required');
	}

	const [job] = await db
		.select()
		.from(aiJobs)
		.where(eq(aiJobs.id, jobId))
		.limit(1);

	if (!job) {
		throw error(404, 'Job not found');
	}

	if (job.userId !== session.user.id) {
		throw error(403, 'Access denied');
	}

	return json({
		jobId: job.id,
		status: job.status,
		result: job.result,
		errorMessage: job.errorMessage,
		payload: job.payload
	});
};