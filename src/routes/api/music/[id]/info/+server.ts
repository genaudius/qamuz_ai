import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music, users } from '$lib/server/db/schema.js';
import { canStreamMusic, isMusicUuid } from '$lib/server/media-access.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	const musicId = params.id;
	if (!musicId || !isMusicUuid(musicId)) {
		throw error(400, 'Invalid music ID');
	}

		const [record] = await db
		.select({
			id: music.id,
			title: music.title,
			prompt: music.prompt,
			imageUrl: music.imageUrl,
			videoUrl: music.videoUrl,
			lyrics: music.lyrics,
			alignedLyrics: music.alignedLyrics,
			durationMs: music.durationMs,
			isPublic: music.isPublic,
			userId: music.userId,
			genre: music.genre,
			tags: music.tags,
			likesCount: music.likesCount,
			playsCount: music.playsCount,
			commentsCount: music.commentsCount,
			artistName: users.name
		})
		.from(music)
		.innerJoin(users, eq(users.id, music.userId))
		.where(eq(music.id, musicId))
		.limit(1);

	if (!record) {
		throw error(404, 'Music not found');
	}

	if (!canStreamMusic(record, session?.user?.id)) {
		throw error(session?.user?.id ? 403 : 401, session?.user?.id
			? 'This track is private'
			: 'Authentication required');
	}

	return json({
		id: record.id,
		title: record.title || record.prompt || 'Untitled track',
		artist: record.artistName || 'QAMUZ',
		artistId: record.userId,
		url: `/api/music/${record.id}`,
		imageUrl: record.imageUrl,
		videoUrl: record.videoUrl,
		lyrics: record.lyrics,
		timedLyrics: record.alignedLyrics || [],
		durationMs: record.durationMs || 0,
		isPublic: record.isPublic,
		genre: record.genre,
		tags: record.tags,
		likesCount: record.likesCount ?? 0,
		playsCount: record.playsCount ?? 0,
		commentsCount: record.commentsCount ?? 0
	});
};
