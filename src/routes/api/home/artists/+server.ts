import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { users, artistProfiles, music, follows } from '$lib/server/db/schema.js';
import { eq, sql, desc, count, and } from 'drizzle-orm';
import { adminSettingsService } from '$lib/server/admin-settings.js';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  const currentUserId = session?.user?.id;

  const hideDemoSetting = await adminSettingsService.getSetting('hide_demo_artists');
  // Default to true: fake demo artists are permanently eliminated
  const hideDemo = hideDemoSetting !== 'false';

  let realArtists: Array<{
    id: string;
    userId: string;
    name: string;
    avatarUrl: string;
    trackCount: number;
    isDemo: boolean;
    isFollowing: boolean;
  }> = [];

  try {
    const rows = await db
      .select({
        profileId: artistProfiles.id,
        userId: users.id,
        stageName: artistProfiles.stageName,
        userName: users.name,
        avatarUrl: artistProfiles.avatarUrl,
        userImage: users.image,
        trackCount: count(music.id),
      })
      .from(users)
      .leftJoin(artistProfiles, eq(artistProfiles.userId, users.id))
      .leftJoin(music, and(eq(music.userId, users.id), eq(music.isPublic, true)))
      .groupBy(
        artistProfiles.id,
        users.id,
        artistProfiles.stageName,
        users.name,
        artistProfiles.avatarUrl,
        users.image
      )
      .having(sql`count(${music.id}) > 0 OR ${artistProfiles.id} IS NOT NULL`)
      .orderBy(desc(count(music.id)))
      .limit(25);

    // If current user is logged in, find which artists they follow
    let followedUserIds = new Set<string>();
    if (currentUserId && rows.length > 0) {
      const followRows = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, currentUserId));
      followedUserIds = new Set(followRows.map((f) => f.followingId));
    }

    realArtists = rows.map((r) => ({
      id: r.profileId || r.userId,
      userId: r.userId,
      name: r.stageName || r.userName || 'Artista',
      avatarUrl: r.avatarUrl || r.userImage || 'https://dummyimage.com/200x200/222/fff&text=Q',
      trackCount: Number(r.trackCount || 0),
      isDemo: false,
      isFollowing: followedUserIds.has(r.userId),
    }));
  } catch (err) {
    console.error('Failed to query real artists:', err);
  }

  // Fake artists are eliminated. We return real artists only.
  return json({
    artists: realArtists,
    hideDemo: true,
    hasRealArtists: realArtists.length > 0,
  });
};
