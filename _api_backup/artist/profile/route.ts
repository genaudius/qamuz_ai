import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, artistProfiles, users } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

	const [profile] = await db.select()
		.from(artistProfiles)
		.where(eq(artistProfiles.userId, session.user.id))
		.limit(1);

	return json({ profile: profile ?? null });
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

		const body = await request.json();
		const { displayName, bio, bannerUrl, genres, socialLinks } = body;

		const updates: Record<string, unknown> = { updatedAt: new Date() };
		if (displayName !== undefined) updates.displayName = displayName?.trim() || null;
		if (bio !== undefined) updates.bio = bio?.trim() || null;
		if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl?.trim() || null;
		if (genres !== undefined) updates.genres = Array.isArray(genres) ? genres : [];
		if (socialLinks !== undefined) updates.socialLinks = typeof socialLinks === 'object' ? socialLinks : {};

		// Upsert: create profile if doesn't exist
		const [existing] = await db.select({ id: artistProfiles.id })
			.from(artistProfiles)
			.where(eq(artistProfiles.userId, session.user.id))
			.limit(1);

		let profile;
		if (existing) {
			[profile] = await db.update(artistProfiles)
				.set(updates)
				.where(eq(artistProfiles.userId, session.user.id))
				.returning();
		} else {
			[profile] = await db.insert(artistProfiles).values({
				id: randomUUID(),
				userId: session.user.id,
				displayName: displayName?.trim() || null,
				bio: bio?.trim() || null,
				bannerUrl: bannerUrl?.trim() || null,
				genres: Array.isArray(genres) ? genres : [],
				socialLinks: typeof socialLinks === 'object' ? socialLinks : {},
			}).returning();
		}

		// Also sync displayName back to user.name if provided
		if (displayName !== undefined && displayName?.trim()) {
			await db.update(users)
				.set({ name: displayName.trim(), updatedAt: new Date() })
				.where(eq(users.id, session.user.id));
		}

		return json({ profile });
	} catch (error) {
		console.error('PATCH /api/artist/profile error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
