import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, playlists } from '$lib/server/db/index.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Unauthorized' }, { status: 401 });

	const { title, description } = await request.json().catch(() => ({ title: '', description: '' }));
	
	if (!title) return json({ error: 'Title is required' }, { status: 400 });

	const id = crypto.randomUUID();
	
	await db.insert(playlists).values({
		id,
		userId: session.user.id,
		title,
		description: description || null,
		isPublic: false
	});

	return json({ id, title });
};
