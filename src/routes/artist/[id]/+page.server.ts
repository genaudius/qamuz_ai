import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { artistProfiles, artists, follows, music, playlists, users } from '$lib/server/db/schema.js';
import { and, count, desc, eq, or } from 'drizzle-orm';
import { DEMO_ARTIST_PROFILES_BY_ID } from '$lib/constants/demo-artists.js';
import { ensureArtistTables } from '$lib/server/artists.js';
import { ensurePlaylistTables } from '$lib/server/playlists.js';

async function findArtistRecord(artistId: string) {
  await ensureArtistTables();

  try {
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
      .where(or(eq(artists.id, artistId), eq(artists.userId, artistId)));

    if (artist) {
      return artist;
    }
  } catch (queryError) {
    console.warn('Primary artist table lookup failed, falling back to artist_profile:', queryError);
  }

  const [artistProfile] = await db
    .select({
      id: artistProfiles.id,
      bio: artistProfiles.bio,
      userId: artistProfiles.userId,
      userName: users.name,
      userImage: users.image,
    })
    .from(artistProfiles)
    .innerJoin(users, eq(users.id, artistProfiles.userId))
    .where(or(eq(artistProfiles.id, artistId), eq(artistProfiles.userId, artistId)));

  if (!artistProfile) {
    return null;
  }

  return {
    id: artistProfile.id,
    bio: artistProfile.bio,
    verifiedAt: null as Date | null,
    userId: artistProfile.userId,
    userName: artistProfile.userName,
    userImage: artistProfile.userImage,
  };
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const artistId = params.id;
  const session = await locals.auth();

  const demoArtist = DEMO_ARTIST_PROFILES_BY_ID.get(artistId);
  if (demoArtist) {
    return {
      artist: {
        id: demoArtist.id,
        bio: demoArtist.bio,
        verifiedAt: demoArtist.verifiedAt,
        userId: demoArtist.id,
        userName: demoArtist.name,
        userImage: demoArtist.avatarUrl,
        followersCount: demoArtist.followersCount,
        isFollowing: false,
        isDemoProfile: true,
        isOwnProfile: false,
      },
      tracks: demoArtist.tracks.map((track) => ({
        ...track,
        tags: [],
        imageUrl: demoArtist.avatarUrl,
        createdAt: demoArtist.verifiedAt,
        prompt: track.title,
        videoUrl: null as string | null,
        lyrics: null as string | null,
        durationMs: null as number | null,
        isInstrumental: false,
      })),
      publicPlaylists: demoArtist.publicPlaylists.map((playlist) => ({
        ...playlist,
        updatedAt: demoArtist.verifiedAt,
      })),
    };
  }

  const artist = await findArtistRecord(artistId);

  if (!artist) {
    throw error(404, 'Artist not found');
  }

  let followersCount = 0;
  let isFollowing = false;

  try {
    const [followersResult, followState] = await Promise.all([
      db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, artist.userId)),
      session?.user?.id
        ? db
            .select({ id: follows.id })
            .from(follows)
            .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, artist.userId)))
            .limit(1)
        : Promise.resolve([]),
    ]);

    followersCount = followersResult[0]?.count ?? 0;
    isFollowing = followState.length > 0;
  } catch (queryError) {
    console.warn('Follow state lookup failed, continuing without follows:', queryError);
  }

  await ensurePlaylistTables();

  const isOwnProfile = session?.user?.id === artist.userId;
  const trackFilter = isOwnProfile
    ? eq(music.userId, artist.userId)
    : and(eq(music.userId, artist.userId), eq(music.isPublic, true));
  const playlistFilter = isOwnProfile
    ? eq(playlists.userId, artist.userId)
    : and(eq(playlists.userId, artist.userId), eq(playlists.isPublic, true));

  const tracks = await db
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
    .limit(60);

  let publicPlaylists: Array<{
    id: string;
    name: string;
    description: string | null;
    updatedAt: Date;
  }> = [];
  try {
    publicPlaylists = await db
      .select({
        id: playlists.id,
        name: playlists.name,
        description: playlists.description,
        updatedAt: playlists.updatedAt,
      })
      .from(playlists)
      .where(playlistFilter)
      .orderBy(desc(playlists.updatedAt))
      .limit(24);
  } catch (queryError) {
    console.warn('Public playlist lookup failed, continuing without playlists:', queryError);
  }

  return {
    artist: {
      ...artist,
      followersCount,
      isFollowing,
      isDemoProfile: false,
      isOwnProfile,
    },
    tracks,
    publicPlaylists,
  };
};

export const actions: Actions = {
  toggleFollow: async ({ params, locals }) => {
    try {
      const session = await locals.auth();
      if (!session?.user?.id) {
        return fail(401, { error: 'Authentication required', action: 'toggleFollow' });
      }

      const artistId = params.id;
      if (DEMO_ARTIST_PROFILES_BY_ID.has(artistId)) {
        return fail(400, { error: 'Demo artists use local follow state only.', action: 'toggleFollow' });
      }

      const artist = await findArtistRecord(artistId);

      if (!artist) {
        return fail(404, { error: 'Artist not found', action: 'toggleFollow' });
      }

      if (artist.userId === session.user.id) {
        return fail(400, { error: 'You cannot follow your own profile', action: 'toggleFollow' });
      }

      const [existingFollow] = await db
        .select({ id: follows.id })
        .from(follows)
        .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, artist.userId)))
        .limit(1);

      if (existingFollow) {
        await db.delete(follows).where(eq(follows.id, existingFollow.id));

        const [followersResult] = await db
          .select({ count: count() })
          .from(follows)
          .where(eq(follows.followingId, artist.userId));

        return {
          success: true,
          action: 'toggleFollow',
          isFollowing: false,
          followersCount: followersResult?.count ?? 0,
        };
      }

      await db.insert(follows).values({
        followerId: session.user.id,
        followingId: artist.userId,
      });

      const [followersResult] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, artist.userId));

      return {
        success: true,
        action: 'toggleFollow',
        isFollowing: true,
        followersCount: followersResult?.count ?? 0,
      };
    } catch (error) {
      console.warn('Follow toggle failed:', error);
      return fail(503, { error: 'Follow feature is unavailable in this local database.', action: 'toggleFollow' });
    }
  }
};
