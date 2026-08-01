import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { playlistItems, playlists, music, users } from '$lib/server/db/schema.js';
import { and, asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const playlistId = params.id;

  const [playlist] = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      description: playlists.description,
      isPublic: playlists.isPublic,
      updatedAt: playlists.updatedAt,
      ownerName: users.name,
      ownerId: users.id,
    })
    .from(playlists)
    .innerJoin(users, eq(users.id, playlists.userId))
    .where(and(eq(playlists.id, playlistId), eq(playlists.isPublic, true)));

  if (!playlist) {
    throw error(404, 'Playlist not found');
  }

  const tracks = await db
    .select({
      id: music.id,
      title: music.title,
      genre: music.genre,
      imageUrl: music.imageUrl,
      likesCount: music.likesCount,
      playsCount: music.playsCount,
      position: playlistItems.position,
    })
    .from(playlistItems)
    .innerJoin(music, eq(music.id, playlistItems.musicId))
    .where(and(eq(playlistItems.playlistId, playlist.id), eq(music.isPublic, true)))
    .orderBy(asc(playlistItems.position));

  return {
    playlist,
    tracks,
  };
};
