import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { artists } from '$lib/server/db/schema.js';
import { and, eq, gt, isNotNull } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
  const token = (url.searchParams.get('token') || '').trim();

  if (!token) {
    throw redirect(302, '/?artistVerification=invalid');
  }

  const [artist] = await db
    .select()
    .from(artists)
    .where(
      and(
        eq(artists.verificationToken, token),
        isNotNull(artists.verificationTokenExpiresAt),
        gt(artists.verificationTokenExpiresAt, new Date()),
      ),
    );

  if (!artist) {
    throw redirect(302, '/?artistVerification=expired');
  }

  await db
    .update(artists)
    .set({
      verifiedAt: new Date(),
      verificationToken: null,
      verificationTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, artist.id));

  throw redirect(302, `/artist/${artist.id}?artistVerification=success`);
};
