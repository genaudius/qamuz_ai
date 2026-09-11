import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { playlistItems, playlists, music, users } from '$lib/server/db/schema.js';
import { and, asc, eq, isNotNull } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
  const playlistId = params.id;
  const session = await locals.auth();

  const [playlist] = await db
    .select({
      id: playlists.id,
      name: playlists.name,
      description: playlists.description,
      isPublic: playlists.isPublic,
      updatedAt: playlists.updatedAt,
      ownerName: users.name,
      ownerId: users.id,
      ownerImage: users.image,
    })
    .from(playlists)
    .innerJoin(users, eq(users.id, playlists.userId))
    .where(eq(playlists.id, playlistId));

  if (!playlist) {
    throw error(404, 'Playlist not found');
  }

  const isOwner = session?.user?.id === playlist.ownerId;
  if (!playlist.isPublic && !isOwner) {
    throw error(404, 'Playlist not found');
  }

  const visibilityFilter = isOwner
    ? and(eq(playlistItems.playlistId, playlist.id), isNotNull(playlistItems.musicId))
    : and(
        eq(playlistItems.playlistId, playlist.id),
        isNotNull(playlistItems.musicId),
        eq(music.isPublic, true)
      );

  const tracks = await db
    .select({
      id: music.id,
      title: music.title,
      prompt: music.prompt,
      genre: music.genre,
      imageUrl: music.imageUrl,
      videoUrl: music.videoUrl,
      lyrics: music.lyrics,
      durationMs: music.durationMs,
      likesCount: music.likesCount,
      playsCount: music.playsCount,
      isInstrumental: music.isInstrumental,
      isPublic: music.isPublic,
      userId: music.userId,
      position: playlistItems.position,
    })
    .from(playlistItems)
    .innerJoin(music, eq(music.id, playlistItems.musicId))
    .where(visibilityFilter)
    .orderBy(asc(playlistItems.position));

  return {
    playlist,
    tracks,
    isOwner,
  };
};
