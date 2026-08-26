import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music, musicLikes } from '$lib/server/db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import { ensureMusicLikeTable } from '$lib/server/music-likes.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const musicId = params.id;
	if (!musicId) {
		return json({ error: 'Falta la canción' }, { status: 400 });
	}

	try {
		await ensureMusicLikeTable();
		const [track] = await db
			.select({ id: music.id, likesCount: music.likesCount })
			.from(music)
			.where(eq(music.id, musicId));
		if (!track) {
			return json({ error: 'No encontré esa canción' }, { status: 404 });
		}

		const [existing] = await db
			.select({ id: musicLikes.id })
			.from(musicLikes)
			.where(and(eq(musicLikes.userId, session.user.id), eq(musicLikes.musicId, musicId)))
			.limit(1);

		return json({ liked: Boolean(existing), likesCount: track.likesCount });
	} catch (error) {
		console.error('Get music like error:', error);
		return json({ error: 'No pude leer el like' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (isDemoModeRestricted(true)) {
		return json({ error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION }, { status: 403 });
	}

	const musicId = params.id;
	if (!musicId) {
		return json({ error: 'Falta la canción' }, { status: 400 });
	}

	try {
		await ensureMusicLikeTable();
		const [track] = await db
			.select({ id: music.id, isPublic: music.isPublic, userId: music.userId, likesCount: music.likesCount })
			.from(music)
			.where(eq(music.id, musicId));
		if (!track) {
			return json({ error: 'No encontré esa canción' }, { status: 404 });
		}
		if (!track.isPublic && track.userId !== session.user.id) {
			return json({ error: 'No puedes dar like a esta canción' }, { status: 403 });
		}

		const [existing] = await db
			.select({ id: musicLikes.id })
			.from(musicLikes)
			.where(and(eq(musicLikes.userId, session.user.id), eq(musicLikes.musicId, musicId)))
			.limit(1);

		if (existing) {
			await db.delete(musicLikes).where(eq(musicLikes.id, existing.id));
			await db
				.update(music)
				.set({ likesCount: sql`GREATEST(${music.likesCount} - 1, 0)` })
				.where(eq(music.id, musicId));
			const [updated] = await db.select({ likesCount: music.likesCount }).from(music).where(eq(music.id, musicId));
			return json({ liked: false, likesCount: updated?.likesCount ?? 0 });
		}

		await db.insert(musicLikes).values({
			userId: session.user.id,
			musicId
		});
		await db
			.update(music)
			.set({ likesCount: sql`${music.likesCount} + 1` })
			.where(eq(music.id, musicId));
		const [updated] = await db.select({ likesCount: music.likesCount }).from(music).where(eq(music.id, musicId));
		return json({ liked: true, likesCount: updated?.likesCount ?? 1 });
	} catch (error) {
		console.error('Toggle music like error:', error);
		return json({ error: 'No pude guardar el like' }, { status: 500 });
	}
};
