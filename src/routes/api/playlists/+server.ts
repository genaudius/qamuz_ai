import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music, playlistItems, playlists } from '$lib/server/db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import { ensurePlaylistTables } from '$lib/server/playlists.js';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		await ensurePlaylistTables();
		const rows = await db
			.select({
				id: playlists.id,
				name: playlists.name,
				updatedAt: playlists.updatedAt,
				trackCount: sql<number>`(
					SELECT COUNT(*)::int FROM playlist_item
					WHERE playlist_item."playlistId" = playlist.id
					AND playlist_item."musicId" IS NOT NULL
				)`.as('trackCount')
			})
			.from(playlists)
			.where(eq(playlists.userId, session.user.id))
			.orderBy(desc(playlists.updatedAt));

		return json({ playlists: rows });
	} catch (error) {
		console.error('List playlists error:', error);
		return json({ error: 'Failed to fetch playlists' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (isDemoModeRestricted(true)) {
		return json({ error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION }, { status: 403 });
	}

	try {
		await ensurePlaylistTables();
		const body = (await request.json()) as { name?: string; musicId?: string };
		const name = (body.name ?? '').trim();
		if (!name) {
			return json({ error: 'El nombre de la playlist es obligatorio' }, { status: 400 });
		}
		if (name.length > 80) {
			return json({ error: 'El nombre debe tener 80 caracteres o menos' }, { status: 400 });
		}

		const [playlist] = await db
			.insert(playlists)
			.values({
				userId: session.user.id,
				name
			})
			.returning();

		let added = false;
		if (body.musicId) {
			const [track] = await db.select({ id: music.id, userId: music.userId, isPublic: music.isPublic }).from(music).where(eq(music.id, body.musicId));
			if (!track) {
				return json({ error: 'No encontré esa canción', playlist }, { status: 404 });
			}
			if (!track.isPublic && track.userId !== session.user.id) {
				return json({ error: 'No puedes guardar esta canción', playlist }, { status: 403 });
			}
			await db.insert(playlistItems).values({
				playlistId: playlist.id,
				musicId: track.id,
				position: 0
			});
			await db.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, playlist.id));
			added = true;
		}

		return json({ playlist, added });
	} catch (error) {
		console.error('Create playlist error:', error);
		return json({ error: 'No pude crear la playlist' }, { status: 500 });
	}
};
