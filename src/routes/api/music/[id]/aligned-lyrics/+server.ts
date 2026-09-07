import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { canStreamMusic, isMusicUuid } from '$lib/server/media-access.js';
import { alignMusicLyrics } from '$lib/server/music/align-lyrics.js';

/**
 * Provider-agnostic karaoke timings.
 * Cascade: cache → Kie (if IDs) → STT on audio → structure heuristic.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
	try {
		const session = await locals.auth();
		const musicId = params.id;
		if (!musicId || !isMusicUuid(musicId)) throw error(400, 'Invalid music ID');

		const [record] = await db
			.select({
				id: music.id,
				userId: music.userId,
				isPublic: music.isPublic
			})
			.from(music)
			.where(eq(music.id, musicId))
			.limit(1);

		if (!record) throw error(404, 'Music not found');
		if (!canStreamMusic(record, session?.user?.id)) {
			throw error(session?.user?.id ? 403 : 401, 'Authentication required');
		}

		const forceRefresh = url.searchParams.get('refresh') === '1';
		const result = await alignMusicLyrics(musicId, { forceRefresh });
		return json(result);
	} catch (err) {
		console.error('Aligned lyrics error:', err);
		if (isHttpError(err)) throw err;
		const message = err instanceof Error ? err.message : 'Failed to load aligned lyrics';
		return json({ lines: [], source: 'error', error: message }, { status: 502 });
	}
};
