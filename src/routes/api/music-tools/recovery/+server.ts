import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getKieAudioRecoveryStatus,
	submitKieAudioRecovery
} from '$lib/ai/providers/kie-music.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		const body = await request.json() as { taskId?: unknown; callBackUrl?: unknown };
		if (typeof body.taskId !== 'string' || !body.taskId.trim()) {
			return json({ error: 'Original Suno taskId is required' }, { status: 400 });
		}
		const recoveryTaskId = await submitKieAudioRecovery(
			body.taskId.trim(),
			typeof body.callBackUrl === 'string' ? body.callBackUrl : undefined
		);
		return json({ taskId: recoveryTaskId, status: 'queued' }, { status: 202 });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Recovery submission failed' }, { status: 502 });
	}
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
	const taskId = url.searchParams.get('taskId');
	if (!taskId) return json({ error: 'Recovery taskId is required' }, { status: 400 });

	try {
		return json(await getKieAudioRecoveryStatus(taskId));
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Recovery status check failed' }, { status: 502 });
	}
};
