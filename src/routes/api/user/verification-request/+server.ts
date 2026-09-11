import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users, artists, artistProfiles } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'No autorizado' }, { status: 401 });
	}

	try {
		const body = await request.json().catch(() => ({}));
		const artistName = (body.artistName ?? '').trim();
		const role = (body.role ?? 'artist').toLowerCase(); // 'artist' | 'producer'
		const bio = (body.bio ?? '').trim();
		const portfolioUrl = (body.portfolioUrl ?? '').trim();

		const [user] = await db
			.select({
				id: users.id,
				name: users.name,
				isAdmin: users.isAdmin,
				artistName: users.artistName,
				userType: users.userType,
				isVerifiedArtist: users.isVerifiedArtist,
				verificationStatus: users.verificationStatus
			})
			.from(users)
			.where(eq(users.id, session.user.id))
			.limit(1);

		if (!user) {
			return json({ error: 'Usuario no encontrado' }, { status: 404 });
		}

		if (user.isAdmin || user.isVerifiedArtist) {
			return json({
				success: true,
				alreadyVerified: true,
				message: 'Ya estás verificado como Artista/Productor'
			});
		}

		const chosenArtistName = artistName || user.artistName || user.name || 'Artista';
		const requestedAt = new Date();

		// Update user record
		const finalRole = ['producer', 'producer_artist'].includes(role) ? role : 'artist';
		await db
			.update(users)
			.set({
				userType: finalRole,
				professionalRole: finalRole,
				artistName: chosenArtistName,
				portfolioUrl: portfolioUrl || user.portfolioUrl || null,
				verificationStatus: 'pending',
				verificationRequestedAt: requestedAt,
				updatedAt: requestedAt
			})
			.where(eq(users.id, user.id));

		// Ensure record in artists table
		const [existingArtist] = await db
			.select({ id: artists.id })
			.from(artists)
			.where(eq(artists.userId, user.id))
			.limit(1);

		if (existingArtist) {
			await db
				.update(artists)
				.set({
					verificationRequestedAt: requestedAt,
					updatedAt: requestedAt
				})
				.where(eq(artists.userId, user.id));
		} else {
			await db.insert(artists).values({
				id: randomUUID(),
				userId: user.id,
				bio: bio || `${role === 'producer' ? 'Productor' : 'Artista'} en QAMUZ AI`,
				verificationRequestedAt: requestedAt
			});
		}

		// Ensure record in artistProfiles
		const [existingProfile] = await db
			.select({ id: artistProfiles.id })
			.from(artistProfiles)
			.where(eq(artistProfiles.userId, user.id))
			.limit(1);

		if (existingProfile) {
			await db
				.update(artistProfiles)
				.set({
					stageName: chosenArtistName,
					bio: bio || existingProfile.bio,
					updatedAt: requestedAt
				})
				.where(eq(artistProfiles.userId, user.id));
		} else {
			await db.insert(artistProfiles).values({
				id: randomUUID(),
				userId: user.id,
				stageName: chosenArtistName,
				bio: bio || `${role === 'producer' ? 'Productor' : 'Artista'} en QAMUZ AI`
			});
		}

		return json({
			success: true,
			verificationStatus: 'pending',
			message: 'Solicitud de verificación enviada con éxito. El equipo de QAMUZ la revisará en breve.'
		});
	} catch (error) {
		console.error('Verification request error:', error);
		return json({ error: 'Error al procesar la solicitud de verificación' }, { status: 500 });
	}
};
