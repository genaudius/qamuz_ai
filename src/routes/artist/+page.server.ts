import { isRedirect, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { artistProfiles, artists } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { ensureArtistTables } from '$lib/server/artists.js';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		throw redirect(302, '/login?callbackUrl=/artist');
	}

	await ensureArtistTables();

	try {
		const [artist] = await db
			.select({ id: artists.id })
			.from(artists)
			.where(eq(artists.userId, session.user.id))
			.limit(1);

		if (artist) {
			throw redirect(302, `/artist/${artist.id}`);
		}
	} catch (queryError) {
		if (isRedirect(queryError)) throw queryError;
		console.warn('Primary artist redirect lookup failed, falling back to artist_profile:', queryError);
	}

	const [artistProfile] = await db
		.select({ id: artistProfiles.id })
		.from(artistProfiles)
		.where(eq(artistProfiles.userId, session.user.id))
		.limit(1);

	if (artistProfile) {
		throw redirect(302, `/artist/${artistProfile.id}`);
	}

	const [createdProfile] = await db
		.insert(artistProfiles)
		.values({
			userId: session.user.id,
			bio: null,
			bannerUrl: null,
		})
		.returning({ id: artistProfiles.id });

	if (createdProfile?.id) {
		throw redirect(302, `/artist/${createdProfile.id}`);
	}

	throw redirect(302, '/?artistProfile=missing');
};