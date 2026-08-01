import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { and, eq, sql } from 'drizzle-orm';
import { adminSettingsService } from '$lib/server/admin-settings.js';

export const GET: RequestHandler = async () => {
  const dbGenres = await db
    .select({ genre: music.genre, count: sql<number>`COUNT(*)::int`.as('count') })
    .from(music)
    .where(and(eq(music.isPublic, true), sql`${music.genre} IS NOT NULL`))
    .groupBy(music.genre)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(30);

  const settings = await adminSettingsService.getSettingsByCategory('music_apis');

  let cachedGenres: string[] = [];
  let cachedTags: string[] = [];

  try {
    cachedGenres = settings.cached_genres ? JSON.parse(settings.cached_genres) : [];
  } catch {
    cachedGenres = [];
  }

  try {
    cachedTags = settings.cached_tags ? JSON.parse(settings.cached_tags) : [];
  } catch {
    cachedTags = [];
  }

  const genres = Array.from(
    new Set(
      [
        ...dbGenres.map((entry) => (entry.genre || '').trim().toLowerCase()),
        ...cachedGenres.map((entry) => entry.trim().toLowerCase()),
      ].filter((value) => value.length > 0),
    ),
  );

  const tags = Array.from(
    new Set(cachedTags.map((entry) => entry.trim().toLowerCase()).filter((value) => value.length > 0)),
  );

  return json({
    genres,
    tags,
    syncedAt: settings.last_sync_at || null,
  });
};
