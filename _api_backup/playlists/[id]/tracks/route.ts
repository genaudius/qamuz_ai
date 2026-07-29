import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, playlists, playlistItems } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Unauthorized' }, { status: 401 });

	const { publicationId } = await request.json().catch(() => ({ publicationId: '' }));
	
	if (!publicationId) return json({ error: 'Publication ID is required' }, { status: 400 });

	const [playlist] = await db
		.select()
		.from(playlists)
		.where(eq(playlists.id, params.id));

	if (!playlist) return json({ error: 'Playlist not found' }, { status: 404 });
	if (playlist.userId !== session.user.id) return json({ error: 'Forbidden' }, { status: 403 });

	// Determine sortOrder (max + 1)
	const items = await db.select({ sortOrder: playlistItems.sortOrder }).from(playlistItems).where(eq(playlistItems.playlistId, playlist.id));
	const nextSortOrder = items.length > 0 ? Math.max(...items.map(i => i.sortOrder)) + 1 : 0;

	try {
		await db.insert(playlistItems).values({
			id: randomUUID(),
			playlistId: playlist.id,
			publicationId,
			sortOrder: nextSortOrder
		});

		// Update track count
		await db.update(playlists).set({ trackCount: playlist.trackCount + 1 }).where(eq(playlists.id, playlist.id));

		return json({ success: true });
	} catch (err: any) {
		if (err.code === '23505') {
			// Unique violation, track already in playlist
			return json({ success: true, message: 'Already added' });
		}
		console.error('Failed to add track to playlist:', err);
		return json({ error: 'Failed to add track' }, { status: 500 });
	}
};
