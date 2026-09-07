import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { isMusicUuid } from '$lib/server/media-access.js';

function normalizeTags(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return Array.from(
		new Set(
			input
				.map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
				.filter((value) => value.length > 0)
		)
	).slice(0, 16);
}

/** Update title / genre / tags without forcing publish. */
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) throw error(401, 'Authentication required');
		if (isDemoModeRestricted(true)) throw error(403, DEMO_MODE_MESSAGES.GENERAL_RESTRICTION);

		const musicId = params.id;
		if (!musicId || !isMusicUuid(musicId)) throw error(400, 'Invalid music ID');

		const payload = (await request.json().catch(() => ({}))) as {
			title?: string;
			genre?: string | null;
			tags?: string[];
		};

		const [track] = await db.select().from(music).where(eq(music.id, musicId));
		if (!track) throw error(404, 'Track not found');
		if (track.userId !== session.user.id) throw error(403, 'Access denied');

		const nextTitle =
			typeof payload.title === 'string' ? payload.title.trim() : track.title;
		if (!nextTitle) throw error(400, 'Title is required');

		const nextGenre =
			payload.genre === undefined
				? track.genre
				: typeof payload.genre === 'string'
					? payload.genre.trim() || null
					: null;
		const nextTags = payload.tags === undefined ? track.tags : normalizeTags(payload.tags);

		const [updated] = await db
			.update(music)
			.set({
				title: nextTitle,
				genre: nextGenre,
				tags: nextTags
			})
			.where(eq(music.id, musicId))
			.returning();

		return json({
			success: true,
			track: {
				id: updated.id,
				title: updated.title,
				genre: updated.genre,
				tags: updated.tags
			}
		});
	} catch (err) {
		console.error('Music meta update error:', err);
		if (isHttpError(err)) throw err;
		throw error(500, 'Failed to update track');
	}
};
