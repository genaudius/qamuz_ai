import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		throw redirect(302, `/login?redirectTo=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const [user] = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			isAdmin: users.isAdmin,
			userType: users.userType,
			artistName: users.artistName,
			isVerifiedArtist: users.isVerifiedArtist,
			verificationStatus: users.verificationStatus,
			planTier: users.planTier
		})
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1);

	if (!user) {
		throw redirect(302, '/login');
	}

	// Access criteria:
	// - Admins always have access
	// - Artists or Producers who are verified (isVerifiedArtist === true)
	const isAllowed = Boolean(
		user.isAdmin ||
		((user.userType === 'artist' || user.userType === 'producer') && user.isVerifiedArtist === true)
	);

	return {
		isAllowed,
		userProfile: {
			id: user.id,
			name: user.name,
			email: user.email,
			isAdmin: Boolean(user.isAdmin),
			userType: user.userType ?? 'fan',
			artistName: user.artistName ?? user.name ?? '',
			isVerifiedArtist: Boolean(user.isVerifiedArtist),
			verificationStatus: user.verificationStatus ?? 'none',
			planTier: user.planTier ?? 'free'
		}
	};
};
