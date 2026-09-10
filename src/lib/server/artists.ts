import { db } from '$lib/server/db/index.js';
import { artistProfiles, artists, users } from '$lib/server/db/schema.js';
import { eq, or } from 'drizzle-orm';

export type PublicArtistRecord = {
	id: string;
	bio: string | null;
	verifiedAt: Date | null;
	userId: string;
	userName: string | null;
	userImage: string | null;
	stageName: string | null;
};

/** Public artist pages always use artist_profile or user record. */
export async function findPublicArtist(artistId: string): Promise<PublicArtistRecord | null> {
	const [row] = await db
		.select({
			id: artistProfiles.id,
			bio: artistProfiles.bio,
			stageName: artistProfiles.stageName,
			userId: artistProfiles.userId,
			userName: users.name,
			userImage: users.image,
			verifiedAt: artists.verifiedAt,
		})
		.from(artistProfiles)
		.innerJoin(users, eq(users.id, artistProfiles.userId))
		.leftJoin(artists, eq(artists.userId, artistProfiles.userId))
		.where(or(eq(artistProfiles.id, artistId), eq(artistProfiles.userId, artistId)))
		.limit(1);

	if (row) return row;

	// Fallback: check if artistId is a user who created songs
	const [userRow] = await db
		.select({
			id: users.id,
			userName: users.name,
			userImage: users.image,
			verifiedAt: artists.verifiedAt,
		})
		.from(users)
		.leftJoin(artists, eq(artists.userId, users.id))
		.where(eq(users.id, artistId))
		.limit(1);

	if (userRow) {
		return {
			id: userRow.id,
			bio: null,
			stageName: userRow.userName,
			userId: userRow.id,
			userName: userRow.userName,
			userImage: userRow.userImage,
			verifiedAt: userRow.verifiedAt,
		};
	}

	return null;
}

export async function getOrCreateArtistProfile(userId: string): Promise<{ id: string }> {
	const [existing] = await db
		.select({ id: artistProfiles.id })
		.from(artistProfiles)
		.where(eq(artistProfiles.userId, userId))
		.limit(1);

	if (existing) return existing;

	const [created] = await db
		.insert(artistProfiles)
		.values({ userId, bio: null, bannerUrl: null })
		.returning({ id: artistProfiles.id });

	if (!created?.id) {
		throw new Error('Could not create artist profile');
	}
	return created;
}
