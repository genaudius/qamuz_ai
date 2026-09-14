import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sessionUser } from '$lib/server/master-jobs.js';
import { listSessionAudio } from '$lib/server/studio-session-store.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	const files = await listSessionAudio(user.id, params.name);
	return json({ files });
};
