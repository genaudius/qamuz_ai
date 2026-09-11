import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { artistProfiles, follows, music, playlists, users } from '$lib/server/db/schema.js';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import { findPublicArtist } from '$lib/server/artists.js';
import { randomUUID } from 'node:crypto';

export const load: PageServerLoad = async ({ params, locals }) => {
  const artistId = params.id;
  const session = await locals.auth();

  const artist = await findPublicArtist(artistId);

  if (!artist) {
    throw error(404, 'Artista no encontrado');
  }

  const isDemoProfile = Boolean(artist.userId?.startsWith('demo-'));
  const isOwnProfile = session?.user?.id === artist.userId;

  const [followersResult, followState] = await Promise.all([
    !isDemoProfile
      ? db
          .select({ count: count() })
          .from(follows)
          .where(eq(follows.followingId, artist.userId))
      : Promise.resolve([]),
    session?.user?.id && !isDemoProfile
      ? db
          .select({ id: follows.id })
          .from(follows)
          .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, artist.userId)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const trackFilter = isOwnProfile
    ? eq(music.userId, artist.userId)
    : and(eq(music.userId, artist.userId), eq(music.isPublic, true));
  const playlistFilter = isOwnProfile
    ? eq(playlists.userId, artist.userId)
    : and(eq(playlists.userId, artist.userId), eq(playlists.isPublic, true));

  const [tracks, publicPlaylists, relatedArtistsRows] = await Promise.all([
    !isDemoProfile
      ? db
          .select({
            id: music.id,
            title: music.title,
            prompt: music.prompt,
            imageUrl: music.imageUrl,
            videoUrl: music.videoUrl,
            lyrics: music.lyrics,
            durationMs: music.durationMs,
            createdAt: music.createdAt,
            playsCount: music.playsCount,
            likesCount: music.likesCount,
            isInstrumental: music.isInstrumental,
          })
          .from(music)
          .where(trackFilter)
          .orderBy(desc(music.createdAt))
          .limit(60)
      : Promise.resolve([]),

    !isDemoProfile
      ? db
          .select({
            id: playlists.id,
            name: playlists.name,
            description: playlists.description,
            updatedAt: playlists.updatedAt,
          })
          .from(playlists)
          .where(playlistFilter)
          .orderBy(desc(playlists.updatedAt))
          .limit(24)
      : Promise.resolve([]),

    // Load real related artists from other users who have public music
    db
      .select({
        profileId: artistProfiles.id,
        userId: users.id,
        stageName: artistProfiles.stageName,
        userName: users.name,
        avatarUrl: artistProfiles.avatarUrl,
        userImage: users.image,
      })
      .from(users)
      .leftJoin(artistProfiles, eq(artistProfiles.userId, users.id))
      .where(and(
        ne(users.id, artist.userId),
        sql`EXISTS (SELECT 1 FROM ${music} WHERE ${music.userId} = ${users.id} AND ${music.isPublic} = true)`
      ))
      .limit(5)
      .catch(() => []),
  ]);

  const relatedArtists = relatedArtistsRows.map((r) => ({
    id: r.profileId || r.userId,
    name: r.stageName || r.userName || 'Artista',
    avatarUrl: r.avatarUrl || r.userImage || 'https://dummyimage.com/200x200/222/fff&text=Q',
  }));

  return {
    artist: {
      ...artist,
      followersCount: followersResult[0]?.count ?? 0,
      isFollowing: followState.length > 0,
      isDemoProfile,
      isOwnProfile,
    },
    tracks,
    publicPlaylists,
    relatedArtists,
  };
};

export const actions: Actions = {
  toggleFollow: async ({ params, locals }) => {
    try {
      const session = await locals.auth();
      if (!session?.user?.id) {
        return fail(401, { error: 'Debes iniciar sesión para seguir artistas', action: 'toggleFollow' });
      }

      const artistId = params.id;
      const artist = await findPublicArtist(artistId);

      if (!artist) {
        return fail(404, { error: 'Artista no encontrado', action: 'toggleFollow' });
      }

      if (artist.userId?.startsWith('demo-')) {
        return fail(400, { error: 'No se puede seguir un perfil de demostración', action: 'toggleFollow' });
      }

      if (artist.userId === session.user.id) {
        return fail(400, { error: 'No puedes seguir tu propio perfil', action: 'toggleFollow' });
      }

      const [existingFollow] = await db
        .select({ id: follows.id })
        .from(follows)
        .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, artist.userId)))
        .limit(1);

      let nextFollowing = false;
      if (existingFollow) {
        await db.delete(follows).where(eq(follows.id, existingFollow.id));
        nextFollowing = false;
      } else {
        await db.insert(follows).values({
          id: randomUUID(),
          followerId: session.user.id,
          followingId: artist.userId,
        });
        nextFollowing = true;
      }

      const [followersResult] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, artist.userId));

      return {
        success: true,
        action: 'toggleFollow',
        isFollowing: nextFollowing,
        followersCount: followersResult?.count ?? 0,
      };
    } catch (error) {
      console.warn('Follow toggle failed:', error);
      return fail(500, { error: 'Error al actualizar seguimiento', action: 'toggleFollow' });
    }
  }
};
