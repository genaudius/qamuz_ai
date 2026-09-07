import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { music, playlistItems, playlists } from '$lib/server/db/schema.js';
import { sessionUser } from '$lib/server/master-jobs.js';

/** Library + playlist songs for Studio Session Gate. */
export const GET: RequestHandler = async ({ locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	const library = await db
		.select({
			id: music.id,
			title: music.title,
			filename: music.filename,
			durationMs: music.durationMs,
			prompt: music.prompt,
			genre: music.genre,
			isInstrumental: music.isInstrumental,
			imageUrl: music.imageUrl,
			createdAt: music.createdAt
		})
		.from(music)
		.where(eq(music.userId, user.id))
		.orderBy(desc(music.createdAt))
		.limit(80);

	const userPlaylists = await db
		.select({
			id: playlists.id,
			name: playlists.name,
			updatedAt: playlists.updatedAt
		})
		.from(playlists)
		.where(eq(playlists.userId, user.id))
		.orderBy(desc(playlists.updatedAt))
		.limit(40);

	const playlistIds = userPlaylists.map((p) => p.id);
	const items =
		playlistIds.length === 0
			? []
			: await db
					.select({
						playlistId: playlistItems.playlistId,
						position: playlistItems.position,
						musicId: music.id,
						title: music.title,
						filename: music.filename,
						durationMs: music.durationMs,
						prompt: music.prompt,
						genre: music.genre,
						isInstrumental: music.isInstrumental,
						imageUrl: music.imageUrl
					})
					.from(playlistItems)
					.innerJoin(music, eq(music.id, playlistItems.musicId))
					.where(inArray(playlistItems.playlistId, playlistIds))
					.orderBy(asc(playlistItems.position));

	const byPlaylist = new Map<string, typeof items>();
	for (const row of items) {
		const list = byPlaylist.get(row.playlistId) || [];
		list.push(row);
		byPlaylist.set(row.playlistId, list);
	}

	const mapSong = (song: {
		id: string;
		title: string | null;
		filename?: string | null;
		durationMs: number | null;
		prompt: string | null;
		genre?: string | null;
		isInstrumental?: boolean | null;
		imageUrl?: string | null;
	}) => ({
		id: song.id,
		title: song.title || song.filename || 'Untitled',
		durationMs: song.durationMs,
		prompt: song.prompt,
		genre: song.genre,
		isInstrumental: Boolean(song.isInstrumental),
		imageUrl: song.imageUrl,
		fetchPath: `/api/music/${song.id}`
	});

	return json({
		library: library.map(mapSong),
		playlists: userPlaylists.map((playlist) => ({
			id: playlist.id,
			name: playlist.name,
			updatedAt: playlist.updatedAt,
			tracks: (byPlaylist.get(playlist.id) || []).map((row) =>
				mapSong({
					id: row.musicId,
					title: row.title,
					filename: row.filename,
					durationMs: row.durationMs,
					prompt: row.prompt,
					genre: row.genre,
					isInstrumental: row.isInstrumental,
					imageUrl: row.imageUrl
				})
			)
		}))
	});
};
