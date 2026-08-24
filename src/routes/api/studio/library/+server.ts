import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music, publications } from '$lib/server/db/schema.js';
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
		.limit(60);

	const pubs = await db
		.select({
			id: publications.id,
			title: publications.title,
			audioUrl: publications.audioUrl,
			durationMs: publications.durationMs,
			createdAt: publications.createdAt
		})
		.from(publications)
		.where(eq(publications.userId, user.id))
		.orderBy(desc(publications.createdAt))
		.limit(40);

	return json({
		tracks: [
			...songs.map((song) => ({
				id: song.id,
				title: song.title || song.filename,
				kind: 'music' as const,
				durationMs: song.durationMs,
				createdAt: song.createdAt,
				prompt: song.prompt,
				fetchPath: `/api/music/${song.id}`
			})),
			...pubs
				.filter((item) => item.audioUrl)
				.map((item) => ({
					id: item.id,
					title: item.title,
					kind: 'publication' as const,
					durationMs: item.durationMs,
					createdAt: item.createdAt,
					audioUrl: item.audioUrl,
					fetchPath: item.audioUrl
				}))
		]
	});
};
