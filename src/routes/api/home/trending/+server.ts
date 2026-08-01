import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { music, users } from '$lib/server/db/schema.js';
import { and, desc, eq, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
  const limitParam = Number(url.searchParams.get('limit') || '24');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 24;

  const tracks = await db
    .select({
      id: music.id,
      title: music.title,
      genre: music.genre,
      tags: music.tags,
      imageUrl: music.imageUrl,
      createdAt: music.createdAt,
      playsCount: music.playsCount,
      likesCount: music.likesCount,
      artistId: users.id,
      artistName: users.name,
    })
    .from(music)
    .innerJoin(users, eq(users.id, music.userId))
    .where(and(eq(music.isPublic, true), sql`${music.title} IS NOT NULL`))
    .orderBy(desc(sql`(${music.playsCount} * 2 + ${music.likesCount})`), desc(music.createdAt))
    .limit(limit);

  return json({ tracks });
};
