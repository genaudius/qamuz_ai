import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, artists, artistProfiles } from '$lib/server/db/schema.js';
import { eq, desc, or, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const load: PageServerLoad = async () => {
	// Query users that are artists, producers, or have requested verification
	const verificationRequests = await db
		.select({
			id: users.id,
			name: users.name,
			email: users.email,
			username: users.username,
			userType: users.userType,
			artistName: users.artistName,
			portfolioUrl: users.portfolioUrl,
			isVerifiedArtist: users.isVerifiedArtist,
			verificationStatus: users.verificationStatus,
			verificationRequestedAt: users.verificationRequestedAt,
			createdAt: users.createdAt
		})
		.from(users)
		.where(
			or(
				eq(users.verificationStatus, 'pending'),
				eq(users.verificationStatus, 'verified'),
				eq(users.verificationStatus, 'rejected'),
				eq(users.userType, 'artist'),
				eq(users.userType, 'producer')
			)
		)
		.orderBy(
			// Sort pending first, then by requested date
			sql`CASE WHEN ${users.verificationStatus} = 'pending' THEN 0 ELSE 1 END`,
			desc(users.verificationRequestedAt),
			desc(users.createdAt)
		);

	const pendingCount = verificationRequests.filter((r) => r.verificationStatus === 'pending').length;
	const verifiedCount = verificationRequests.filter((r) => r.isVerifiedArtist).length;

	return {
		requests: verificationRequests,
		pendingCount,
		verifiedCount
	};
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.isAdmin) {
			throw error(403, 'No autorizado');
		}

		const formData = await request.formData();
		const userId = String(formData.get('userId') ?? '');

		if (!userId) {
			return fail(400, { error: 'Falta ID de usuario' });
		}

		const now = new Date();

		// Update user
		await db
			.update(users)
			.set({
				isVerifiedArtist: true,
				verificationStatus: 'verified',
				updatedAt: now
			})
			.where(eq(users.id, userId));

		// Update or insert artists table
		const [existingArtist] = await db
			.select({ id: artists.id })
			.from(artists)
			.where(eq(artists.userId, userId))
			.limit(1);

		if (existingArtist) {
			await db
				.update(artists)
				.set({
					verifiedAt: now,
					updatedAt: now
				})
				.where(eq(artists.userId, userId));
		} else {
			await db.insert(artists).values({
				id: randomUUID(),
				userId,
				verifiedAt: now
			});
		}

		return { success: true, message: 'Usuario verificado como Artista/Productor' };
	},

	reject: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.isAdmin) {
			throw error(403, 'No autorizado');
		}

		const formData = await request.formData();
		const userId = String(formData.get('userId') ?? '');

		if (!userId) {
			return fail(400, { error: 'Falta ID de usuario' });
		}

		await db
			.update(users)
			.set({
				isVerifiedArtist: false,
				verificationStatus: 'rejected',
				updatedAt: new Date()
			})
			.where(eq(users.id, userId));

		return { success: true, message: 'Solicitud rechazada' };
	},

	revoke: async ({ request, locals }) => {
		const session = await locals.auth();
		if (!session?.user?.isAdmin) {
			throw error(403, 'No autorizado');
		}

		const formData = await request.formData();
		const userId = String(formData.get('userId') ?? '');

		if (!userId) {
			return fail(400, { error: 'Falta ID de usuario' });
		}

		await db
			.update(users)
			.set({
				isVerifiedArtist: false,
				verificationStatus: 'none',
				updatedAt: new Date()
			})
			.where(eq(users.id, userId));

		await db
			.update(artists)
			.set({
				verifiedAt: null,
				updatedAt: new Date()
			})
			.where(eq(artists.userId, userId));

		return { success: true, message: 'Verificación revocada' };
	}
};
