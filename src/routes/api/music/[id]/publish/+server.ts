import { json, error, isHttpError } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { music } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
        .filter((value) => value.length > 0),
    ),
  ).slice(0, 12);
}

export const POST: RequestHandler = async ({ params, request, locals }) => {
  try {
    const session = await locals.auth();
    if (!session?.user?.id) {
      throw error(401, 'Authentication required');
    }

    if (isDemoModeRestricted(true)) {
      throw error(403, DEMO_MODE_MESSAGES.GENERAL_RESTRICTION);
    }

    const musicId = params.id;
    if (!musicId) {
      throw error(400, 'Music ID is required');
    }

    const payload = await request.json() as {
      title?: string;
      genre?: string | null;
      tags?: string[];
    };

    const title = (payload.title || '').trim();
    const genre = (payload.genre || '').trim();
    const tags = normalizeTags(payload.tags);

    if (!title) {
      throw error(400, 'Title is required');
    }

    const [track] = await db.select().from(music).where(eq(music.id, musicId));

    if (!track) {
      throw error(404, 'Track not found');
    }

    if (track.userId !== session.user.id) {
      throw error(403, 'Access denied');
    }

    const [updated] = await db
      .update(music)
      .set({
        title,
        genre: genre || null,
        tags,
        isPublic: true,
      })
      .where(eq(music.id, musicId))
      .returning();

    return json({ success: true, track: updated });
  } catch (err) {
    console.error('Music publish error:', err);
    if (isHttpError(err)) {
      throw err;
    }
    throw error(500, 'Failed to publish track');
  }
};
