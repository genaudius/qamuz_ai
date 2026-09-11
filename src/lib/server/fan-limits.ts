import { db } from '$lib/server/db/index.js';
import { users, follows, playlists, playlistItems, music } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';

export interface FanLimitCheckResult {
	allowed: boolean;
	isUnlimited: boolean;
	currentArtistCount: number;
	limit: number;
	price: number;
	reason?: string;
}

export const FAN_FREE_ARTIST_LIMIT = 5;
export const FAN_UNLIMITED_PRICE_USD = 8;

/**
 * Checks if a user can interact with (follow or add song from) a candidate artist.
 * Fans can follow / add music from up to 5 distinct artists for free.
 * Beyond 5 artists, they require the $8/month Fan Unlimited plan.
 */
export async function checkFanArtistLimit(
	userId: string,
	candidateArtistId?: string | null
): Promise<FanLimitCheckResult> {
	if (!userId) {
		return {
			allowed: false,
			isUnlimited: false,
			currentArtistCount: 0,
			limit: FAN_FREE_ARTIST_LIMIT,
			price: FAN_UNLIMITED_PRICE_USD,
			reason: 'AUTH_REQUIRED'
		};
	}

	// 1. Check user status
	const [user] = await db
		.select({
			id: users.id,
			isAdmin: users.isAdmin,
			userType: users.userType,
			planTier: users.planTier,
			subscriptionStatus: users.subscriptionStatus,
			hasUnlimitedFanAccess: users.hasUnlimitedFanAccess
		})
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!user) {
		return {
			allowed: false,
			isUnlimited: false,
			currentArtistCount: 0,
			limit: FAN_FREE_ARTIST_LIMIT,
			price: FAN_UNLIMITED_PRICE_USD,
			reason: 'USER_NOT_FOUND'
		};
	}

	// Admins, paid subscription tiers, or users with unlimited fan access bypass limits
	const isPaidSubscription =
		user.subscriptionStatus === 'active' && user.planTier && user.planTier !== 'free';

	if (user.isAdmin || user.hasUnlimitedFanAccess || isPaidSubscription) {
		return {
			allowed: true,
			isUnlimited: true,
			currentArtistCount: 0,
			limit: FAN_FREE_ARTIST_LIMIT,
			price: FAN_UNLIMITED_PRICE_USD
		};
	}

	// Non-fans (registered artists / producers) managing their own music or content
	if (user.userType === 'artist' || user.userType === 'producer') {
		return {
			allowed: true,
			isUnlimited: true,
			currentArtistCount: 0,
			limit: FAN_FREE_ARTIST_LIMIT,
			price: FAN_UNLIMITED_PRICE_USD
		};
	}

	// 2. Aggregate distinct artists for this Fan:
	// A. Followed artists
	const followedRows = await db
		.select({ artistId: follows.followingId })
		.from(follows)
		.where(eq(follows.followerId, userId));

	// B. Artists whose songs are in the fan's playlists
	const playlistArtistRows = await db
		.select({ artistId: music.userId })
		.from(playlistItems)
		.innerJoin(playlists, eq(playlists.id, playlistItems.playlistId))
		.innerJoin(music, eq(music.id, playlistItems.musicId))
		.where(and(eq(playlists.userId, userId), sql`${music.userId} IS NOT NULL`));

	const distinctArtistIds = new Set<string>();

	for (const row of followedRows) {
		if (row.artistId && !row.artistId.startsWith('demo-') && row.artistId !== userId) {
			distinctArtistIds.add(row.artistId);
		}
	}

	for (const row of playlistArtistRows) {
		if (row.artistId && !row.artistId.startsWith('demo-') && row.artistId !== userId) {
			distinctArtistIds.add(row.artistId);
		}
	}

	const currentArtistCount = distinctArtistIds.size;

	// If candidate artist is provided:
	if (candidateArtistId && candidateArtistId !== userId) {
		// If candidate is already one of the fan's artists, allow
		if (distinctArtistIds.has(candidateArtistId)) {
			return {
				allowed: true,
				isUnlimited: false,
				currentArtistCount,
				limit: FAN_FREE_ARTIST_LIMIT,
				price: FAN_UNLIMITED_PRICE_USD
			};
		}

		// If candidate is new and fan already reached 5 distinct artists, block
		if (currentArtistCount >= FAN_FREE_ARTIST_LIMIT) {
			return {
				allowed: false,
				isUnlimited: false,
				currentArtistCount,
				limit: FAN_FREE_ARTIST_LIMIT,
				price: FAN_UNLIMITED_PRICE_USD,
				reason: 'FAN_ARTIST_LIMIT_REACHED'
			};
		}
	}

	return {
		allowed: currentArtistCount < FAN_FREE_ARTIST_LIMIT,
		isUnlimited: false,
		currentArtistCount,
		limit: FAN_FREE_ARTIST_LIMIT,
		price: FAN_UNLIMITED_PRICE_USD
	};
}
