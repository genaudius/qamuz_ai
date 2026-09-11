import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, artistProfiles, artists } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const fullName = (body.fullName ?? '').trim();
		const username = (body.username ?? '').trim().replace(/^@+/, '').toLowerCase();
		const userType = (body.userType ?? 'fan').toLowerCase(); // 'artist' | 'producer' | 'fan'
		const artistName = (body.artistName ?? '').trim();
		const portfolioUrl = (body.portfolioUrl ?? '').trim();
		const requestVerification = Boolean(body.requestVerification);

		if (!['artist', 'producer', 'fan'].includes(userType)) {
			return json({ error: 'Tipo de usuario no válido' }, { status: 400 });
		}

		if (userType === 'artist' && !artistName) {
			return json({ error: 'El nombre artístico es obligatorio para artistas' }, { status: 400 });
		}

		if (userType === 'producer' && !artistName) {
			return json({ error: 'El nombre como productor es obligatorio para productores' }, { status: 400 });
		}

		// Calculate verification status:
		// If user is already verified (or admin), keep it. Otherwise 'pending' if requested, else 'none'.
		const [currentUser] = await db
			.select({
				isAdmin: users.isAdmin,
				isVerifiedArtist: users.isVerifiedArtist,
				verificationStatus: users.verificationStatus
			})
			.from(users)
			.where(eq(users.id, session.user.id))
			.limit(1);

		let isVerified = currentUser?.isVerifiedArtist || currentUser?.isAdmin || false;
		let verificationStatus = currentUser?.verificationStatus || 'none';
		let verificationRequestedAt: Date | null = null;

		if (!isVerified) {
			if (requestVerification && (userType === 'artist' || userType === 'producer')) {
				verificationStatus = 'pending';
				verificationRequestedAt = new Date();
			}
		}

		// Update user record
		await db
			.update(users)
			.set({
				name: fullName || session.user.name,
				username: username || undefined,
				userType,
				artistName: artistName || null,
				professionalRole: userType === 'fan' ? 'none' : userType === 'producer' ? 'producer' : 'artist',
				portfolioUrl: portfolioUrl || null,
				isVerifiedArtist: isVerified,
				verificationStatus,
				...(verificationRequestedAt ? { verificationRequestedAt } : {}),
				updatedAt: new Date()
			})
			.where(eq(users.id, session.user.id));

		// If artist or producer, ensure public artistProfile exists
		if (userType === 'artist' || userType === 'producer') {
			const [existingProfile] = await db
				.select({ id: artistProfiles.id })
				.from(artistProfiles)
				.where(eq(artistProfiles.userId, session.user.id))
				.limit(1);

			if (existingProfile) {
				await db
					.update(artistProfiles)
					.set({
						stageName: artistName,
						updatedAt: new Date()
					})
					.where(eq(artistProfiles.userId, session.user.id));
			} else {
				await db.insert(artistProfiles).values({
					id: randomUUID(),
					userId: session.user.id,
					stageName: artistName,
					bio: userType === 'producer' ? 'Productor Musical en QAMUZ AI' : 'Artista en QAMUZ AI'
				});
			}

			// Ensure record in artists table
			const [existingArtist] = await db
				.select({ id: artists.id })
				.from(artists)
				.where(eq(artists.userId, session.user.id))
				.limit(1);

			if (!existingArtist) {
				await db.insert(artists).values({
					id: randomUUID(),
					userId: session.user.id,
					verificationRequestedAt: verificationRequestedAt || undefined,
					verifiedAt: isVerified ? new Date() : undefined
				});
			} else if (verificationRequestedAt) {
				await db
					.update(artists)
					.set({
						verificationRequestedAt,
						updatedAt: new Date()
					})
					.where(eq(artists.userId, session.user.id));
			}
		}

		return json({
			success: true,
			userType,
			artistName,
			verificationStatus,
			isVerifiedArtist: isVerified
		});
	} catch (error) {
		console.error('Onboarding update error:', error);
		return json({ error: 'Error al actualizar tu perfil' }, { status: 500 });
	}
};
