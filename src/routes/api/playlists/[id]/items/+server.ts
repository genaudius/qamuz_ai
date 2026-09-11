import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music, playlistItems, playlists } from '$lib/server/db/schema.js';
import { and, eq, max } from 'drizzle-orm';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { checkFanArtistLimit } from '$lib/server/fan-limits.js';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (isDemoModeRestricted(true)) {
		return json({ error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION }, { status: 403 });
	}

	try {
		const playlistId = params.id;
		const body = (await request.json()) as { musicId?: string };
		const musicId = (body.musicId ?? '').trim();
		if (!playlistId || !musicId) {
			return json({ error: 'Falta la playlist o la canción' }, { status: 400 });
		}

		const [playlist] = await db
			.select({ id: playlists.id })
			.from(playlists)
			.where(and(eq(playlists.id, playlistId), eq(playlists.userId, session.user.id)));
		if (!playlist) {
			return json({ error: 'Playlist no encontrada' }, { status: 404 });
		}

		const [track] = await db
			.select({ id: music.id, userId: music.userId, isPublic: music.isPublic })
			.from(music)
			.where(eq(music.id, musicId));
		if (!track) {
			return json({ error: 'No encontré esa canción' }, { status: 404 });
		}
		if (!track.isPublic && track.userId !== session.user.id) {
			return json({ error: 'No puedes guardar esta canción' }, { status: 403 });
		}

		// Enforce Fan limit of 5 artists
		if (track.userId && track.userId !== session.user.id) {
			const limitCheck = await checkFanArtistLimit(session.user.id, track.userId);
			if (!limitCheck.allowed) {
				return json({
					error: 'FAN_ARTIST_LIMIT_REACHED',
					message: 'Has alcanzado el límite gratuito de 5 artistas. Suscríbete a la Membresía Fan Ilimitado por solo $8/mes para agregar canciones de más artistas.',
					limit: limitCheck.limit,
					price: limitCheck.price
				}, { status: 403 });
			}
		}

		const [last] = await db
			.select({ position: max(playlistItems.position) })
			.from(playlistItems)
			.where(eq(playlistItems.playlistId, playlist.id));
		const position = (last?.position ?? -1) + 1;

		try {
			await db.insert(playlistItems).values({
				playlistId: playlist.id,
				musicId: track.id,
				position
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : '';
			if (message.includes('playlist_item_music_unique') || message.includes('duplicate')) {
				return json({ ok: true, alreadyInPlaylist: true });
			}
			throw error;
		}

		await db.update(playlists).set({ updatedAt: new Date() }).where(eq(playlists.id, playlist.id));
		return json({ ok: true, alreadyInPlaylist: false });
	} catch (error) {
		console.error('Add playlist item error:', error);
		return json({ error: 'No pude agregar la canción a la playlist' }, { status: 500 });
	}
};
