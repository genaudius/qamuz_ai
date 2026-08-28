import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getOrCreateArtistProfile } from '$lib/server/artists.js';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		throw redirect(302, '/login?callbackUrl=/artist');
	}

	const profile = await getOrCreateArtistProfile(session.user.id);
	throw redirect(302, `/artist/${profile.id}`);
};
