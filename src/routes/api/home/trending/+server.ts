import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { music, users } from '$lib/server/db/schema.js';
import { and, desc, eq, or, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
  const limitParam = Number(url.searchParams.get('limit') || '24');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 24;
  const genre = (url.searchParams.get('genre') || '').trim().toLowerCase();

  const filters = [eq(music.isPublic, true), sql`${music.title} IS NOT NULL`];
  if (genre) {
    filters.push(
      or(
        sql`lower(${music.genre}) = ${genre}`,
        sql`lower(${music.genre}) LIKE ${`${genre}%`}`,
        sql`EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(${music.tags}::jsonb) AS tag(value)
          WHERE lower(tag.value) = ${genre}
        )`,
      )!,
    );
  }

  const tracks = await db
    .select({
      id: music.id,
      title: music.title,
      genre: music.genre,
      tags: music.tags,
      imageUrl: music.imageUrl,
      videoUrl: music.videoUrl,
      lyrics: music.lyrics,
      durationMs: music.durationMs,
      createdAt: music.createdAt,
      playsCount: music.playsCount,
      likesCount: music.likesCount,
      artistId: users.id,
      userId: users.id,
      artistName: users.name,
    })
    .from(music)
    .innerJoin(users, eq(users.id, music.userId))
    .where(and(...filters))
    .orderBy(desc(sql`(${music.playsCount} * 2 + ${music.likesCount})`), desc(music.createdAt))
    .limit(limit);

  return json({
    tracks: tracks.map((track) => ({
      ...track,
      url: `/api/music/${track.id}`,
    })),
  });
};
