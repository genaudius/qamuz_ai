import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { artists, music, playlists, users } from '$lib/server/db/schema.js';
import { and, desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const artistId = params.id;

  const [artist] = await db
    .select({
      id: artists.id,
      bio: artists.bio,
      verifiedAt: artists.verifiedAt,
      userId: artists.userId,
      userName: users.name,
      userImage: users.image,
    })
    .from(artists)
    .innerJoin(users, eq(users.id, artists.userId))
    .where(eq(artists.id, artistId));

  if (!artist) {
    throw error(404, 'Artist not found');
  }

  const [tracks, publicPlaylists] = await Promise.all([
    db
      .select({
        id: music.id,
        title: music.title,
        genre: music.genre,
        tags: music.tags,
        imageUrl: music.imageUrl,
        createdAt: music.createdAt,
        playsCount: music.playsCount,
        likesCount: music.likesCount,
      })
      .from(music)
      .where(and(eq(music.userId, artist.userId), eq(music.isPublic, true)))
      .orderBy(desc(music.createdAt))
      .limit(60),
    db
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        updatedAt: playlists.updatedAt,
      })
      .from(playlists)
      .where(and(eq(playlists.userId, artist.userId), eq(playlists.isPublic, true)))
      .orderBy(desc(playlists.updatedAt))
      .limit(24),
  ]);

  return {
    artist,
    tracks,
    publicPlaylists,
  };
};
