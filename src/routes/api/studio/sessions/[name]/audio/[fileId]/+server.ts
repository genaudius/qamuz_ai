import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sessionUser } from '$lib/server/master-jobs.js';
import { loadSessionAudio, saveSessionAudio } from '$lib/server/studio-session-store.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	const bytes = await loadSessionAudio(user.id, params.name, params.fileId);
	if (!bytes) return json({ error: 'Audio not found' }, { status: 404 });

	return new Response(new Uint8Array(bytes), {
		headers: {
			'Content-Type': 'audio/wav',
			'Cache-Control': 'private, max-age=3600'
		}
	});
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		const arrayBuffer = await request.arrayBuffer();
		if (!arrayBuffer.byteLength) return json({ error: 'Empty audio body' }, { status: 400 });

		await saveSessionAudio(user.id, params.name, params.fileId, Buffer.from(arrayBuffer));
		return json({ ok: true });
	} catch (error) {
		console.error('studio session audio save', error);
		return json({ error: (error as Error).message }, { status: 400 });
	}
};
