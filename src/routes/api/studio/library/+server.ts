import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { sessionUser } from '$lib/server/master-jobs.js';

export const GET: RequestHandler = async ({ locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	const songs = await db
		.select({
			id: music.id,
			title: music.title,
			filename: music.filename,
			durationMs: music.durationMs,
			createdAt: music.createdAt,
			prompt: music.prompt
		})
		.from(music)
		.where(eq(music.userId, user.id))
		.orderBy(desc(music.createdAt))
		.limit(100);

	return json({
		tracks: songs.map((song) => ({
			id: song.id,
			title: song.title || song.filename,
			kind: 'music' as const,
			durationMs: song.durationMs,
			createdAt: song.createdAt,
			prompt: song.prompt,
			fetchPath: `/api/music/${song.id}`
		}))
	});
};
