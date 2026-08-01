import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomBytes } from 'crypto';
import { db } from '$lib/server/db/index.js';
import { artists, users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { emailService } from '$lib/server/email.js';
import { getPublicOrigin } from '$lib/server/settings-store.js';

export const POST: RequestHandler = async ({ locals, request }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    throw error(401, 'Authentication required');
  }

  const payload = await request.json().catch(() => ({})) as { email?: string; bio?: string };

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user) {
    throw error(404, 'User not found');
  }

  const email = (payload.email || user.email || '').trim().toLowerCase();
  if (!email) {
    throw error(400, 'Verification email is required');
  }

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const [existingArtist] = await db.select().from(artists).where(eq(artists.userId, session.user.id));

  if (!existingArtist) {
    await db.insert(artists).values({
      userId: session.user.id,
      bio: payload.bio?.trim() || null,
      verificationEmail: email,
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
      verificationRequestedAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(artists)
      .set({
        bio: payload.bio?.trim() || existingArtist.bio,
        verificationEmail: email,
        verificationToken: token,
        verificationTokenExpiresAt: expiresAt,
        verificationRequestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(artists.id, existingArtist.id));
  }

  const origin = await getPublicOrigin();
  const verificationUrl = `${origin}/api/artist/verify/confirm?token=${token}`;

  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Verify your artist profile',
      html: `
        <p>Hello,</p>
        <p>Click the link below to verify your artist profile on QAMUZ:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      `,
      text: `Hello,\n\nVerify your artist profile on QAMUZ:\n${verificationUrl}\n\nThis link expires in 24 hours.`,
    });
  } catch (emailError) {
    console.error('Artist verification email failed:', emailError);
  }

  return json({
    success: true,
    message: 'Verification request created. Check your inbox for the link.',
  });
};
