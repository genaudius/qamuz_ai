import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { canStreamMusic, isMusicUuid } from '$lib/server/media-access.js';

/** Record one view/play for a track (deduped client-side; server always increments for public). */
export const POST: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	const musicId = params.id;
	if (!musicId || !isMusicUuid(musicId)) {
		return json({ error: 'Invalid music ID' }, { status: 400 });
	}

	try {
		const [track] = await db
			.select({
				id: music.id,
				isPublic: music.isPublic,
				userId: music.userId,
				playsCount: music.playsCount
			})
			.from(music)
			.where(eq(music.id, musicId))
			.limit(1);

		if (!track) {
			return json({ error: 'No encontré esa canción' }, { status: 404 });
		}
		const isAdmin = Boolean((session?.user as any)?.isAdmin || session?.user?.role === 'admin');
		if (!canStreamMusic(track, session?.user?.id, isAdmin)) {
			return json({ error: 'No puedes registrar esta vista' }, { status: 403 });
		}

		// Count views for public tracks (YouTube-style). Owner preview of private tracks skips.
		if (!track.isPublic) {
			return json({
				counted: false,
				playsCount: track.playsCount,
				isPublic: false
			});
		}

		await db
			.update(music)
			.set({ playsCount: sql`${music.playsCount} + 1` })
			.where(eq(music.id, musicId));

		const [updated] = await db
			.select({ playsCount: music.playsCount })
			.from(music)
			.where(eq(music.id, musicId))
			.limit(1);

		return json({
			counted: true,
			playsCount: updated?.playsCount ?? track.playsCount + 1,
			isPublic: true
		});
	} catch (error) {
		console.error('Record music view error:', error);
		return json({ error: 'No pude registrar la vista' }, { status: 500 });
	}
};
