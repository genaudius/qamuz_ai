import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sessionUser } from '$lib/server/master-jobs.js';
import { loadSessionProject, saveSessionProject } from '$lib/server/studio-session-store.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	const doc = await loadSessionProject(user.id, params.name);
	if (!doc) return json({ error: 'Session not found' }, { status: 404 });
	return json({ name: params.name, projectJson: doc.projectJson, trainingJson: doc.trainingJson });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const projectJson = typeof body.projectJson === 'string' ? body.projectJson : '';
		if (!projectJson) return json({ error: 'projectJson is required' }, { status: 400 });

		await saveSessionProject(user.id, params.name, {
			name: typeof body.name === 'string' ? body.name : params.name,
			projectJson,
			trainingJson: typeof body.trainingJson === 'string' ? body.trainingJson : ''
		});
		return json({ ok: true });
	} catch (error) {
		console.error('studio session project save', error);
		return json({ error: (error as Error).message }, { status: 400 });
	}
};
