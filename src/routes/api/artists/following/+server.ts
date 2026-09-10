import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { follows, users, artistProfiles, music } from '$lib/server/db/schema.js';
import { eq, and, sql, count, desc } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ artists: [] });
  }

  try {
    const rows = await db
      .select({
        followId: follows.id,
        followedAt: follows.createdAt,
        userId: users.id,
        profileId: artistProfiles.id,
        stageName: artistProfiles.stageName,
        userName: users.name,
        avatarUrl: artistProfiles.avatarUrl,
        userImage: users.image,
        trackCount: count(music.id),
      })
      .from(follows)
      .innerJoin(users, eq(users.id, follows.followingId))
      .leftJoin(artistProfiles, eq(artistProfiles.userId, users.id))
      .leftJoin(music, and(eq(music.userId, users.id), eq(music.isPublic, true)))
      .where(eq(follows.followerId, session.user.id))
      .groupBy(
        follows.id,
        follows.createdAt,
        users.id,
        artistProfiles.id,
        artistProfiles.stageName,
        users.name,
        artistProfiles.avatarUrl,
        users.image
      )
      .orderBy(desc(follows.createdAt));

    const artists = rows.map((r) => ({
      id: r.profileId || r.userId,
      userId: r.userId,
      name: r.stageName || r.userName || 'Artista',
      avatarUrl: r.avatarUrl || r.userImage || 'https://dummyimage.com/200x200/222/fff&text=Q',
      trackCount: Number(r.trackCount || 0),
      followedAt: r.followedAt,
      isFollowing: true,
    }));

    return json({ artists });
  } catch (error) {
    console.error('Error fetching followed artists:', error);
    return json({ artists: [], error: 'Failed to fetch followed artists' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const artistUserId = String(body.artistUserId || body.artistId || '').trim();
    const action = body.action as 'follow' | 'unfollow' | undefined;

    if (!artistUserId) {
      return json({ error: 'ID de artista no proporcionado' }, { status: 400 });
    }

    if (artistUserId === session.user.id) {
      return json({ error: 'No puedes seguirte a ti mismo' }, { status: 400 });
    }

    // Resolve target userId (artistUserId might be an artistProfile id or userId)
    let targetUserId = artistUserId;
    const [profile] = await db
      .select({ userId: artistProfiles.userId })
      .from(artistProfiles)
      .where(eq(artistProfiles.id, artistUserId))
      .limit(1);

    if (profile?.userId) {
      targetUserId = profile.userId;
    }

    const [existing] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, session.user.id), eq(follows.followingId, targetUserId)))
      .limit(1);

    let isFollowing = false;

    if (action === 'unfollow' || (!action && existing)) {
      if (existing) {
        await db.delete(follows).where(eq(follows.id, existing.id));
      }
      isFollowing = false;
    } else {
      if (!existing) {
        await db.insert(follows).values({
          id: randomUUID(),
          followerId: session.user.id,
          followingId: targetUserId,
        });
      }
      isFollowing = true;
    }

    const [followersCountResult] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.followingId, targetUserId));

    return json({
      success: true,
      isFollowing,
      followersCount: followersCountResult?.count ?? 0,
    });
  } catch (error) {
    console.error('Error toggling follow:', error);
    return json({ error: 'Error al actualizar seguimiento' }, { status: 500 });
  }
};
