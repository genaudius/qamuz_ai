import { db } from '$lib/server/db/index.js';
import { artistProfiles, artists, users } from '$lib/server/db/schema.js';
import { eq, or, sql } from 'drizzle-orm';
import { DEMO_ARTIST_PROFILES_BY_ID } from '$lib/constants/demo-artists.js';

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
	if (!artistId?.trim()) return null;
	const cleanId = artistId.trim();
	const decoded = decodeURIComponent(cleanId);

	// 1. Direct match on artistProfiles id or userId
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
		.where(or(eq(artistProfiles.id, cleanId), eq(artistProfiles.userId, cleanId)))
		.limit(1);

	if (row) return row;

	// 2. Fallback: check if artistId matches a user's id directly
	const [userRow] = await db
		.select({
			id: users.id,
			userName: users.name,
			userImage: users.image,
			verifiedAt: artists.verifiedAt,
		})
		.from(users)
		.leftJoin(artists, eq(artists.userId, users.id))
		.where(eq(users.id, cleanId))
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

	// 3. Fallback: search by stageName or username (case-insensitive)
	const [nameMatch] = await db
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
		.where(or(
			sql`LOWER(${artistProfiles.stageName}) = LOWER(${decoded})`,
			sql`LOWER(${users.name}) = LOWER(${decoded})`
		))
		.limit(1);

	if (nameMatch) return nameMatch;

	// 4. Fallback: user without profile matched by name
	const [userNameMatch] = await db
		.select({
			id: users.id,
			userName: users.name,
			userImage: users.image,
			verifiedAt: artists.verifiedAt,
		})
		.from(users)
		.leftJoin(artists, eq(artists.userId, users.id))
		.where(sql`LOWER(${users.name}) = LOWER(${decoded})`)
		.limit(1);

	if (userNameMatch) {
		return {
			id: userNameMatch.id,
			bio: null,
			stageName: userNameMatch.userName,
			userId: userNameMatch.id,
			userName: userNameMatch.userName,
			userImage: userNameMatch.userImage,
			verifiedAt: userNameMatch.verifiedAt,
		};
	}

	// 5. Graceful fallback for legacy demo artist slugs (prevent dead 404s)
	const demo = DEMO_ARTIST_PROFILES_BY_ID.get(cleanId) || DEMO_ARTIST_PROFILES_BY_ID.get(decoded);
	if (demo) {
		return {
			id: demo.id,
			bio: demo.bio || null,
			stageName: demo.name,
			userId: `demo-${demo.id}`,
			userName: demo.name,
			userImage: demo.avatarUrl,
			verifiedAt: demo.verified ? new Date() : null,
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
