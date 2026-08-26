import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';

let tableReady = false;

/** Create artist / artist_profile / follow if this database never got the migration. */
export async function ensureArtistTables(): Promise<void> {
	if (tableReady) return;

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "artist_profile" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
			"stageName" text,
			"bio" text,
			"avatarUrl" text,
			"bannerUrl" text,
			"createdAt" timestamp DEFAULT now() NOT NULL,
			"updatedAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "stageName" text
	`);
	await db.execute(sql`
		ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "avatarUrl" text
	`);
	await db.execute(sql`
		ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "bio" text
	`);
	await db.execute(sql`
		ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "bannerUrl" text
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "artist_profiles_user_idx" ON "artist_profile" ("userId")
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "artist" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"bio" text,
			"verificationEmail" text,
			"verificationToken" text,
			"verificationTokenExpiresAt" timestamp,
			"verificationRequestedAt" timestamp,
			"verifiedAt" timestamp,
			"createdAt" timestamp DEFAULT now() NOT NULL,
			"updatedAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "artist_user_idx" ON "artist" ("userId")
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "artist_verification_token_idx" ON "artist" ("verificationToken")
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "follow" (
			"id" text PRIMARY KEY NOT NULL,
			"followerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"followingId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS "follow_pair_unique" ON "follow" ("followerId", "followingId")
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "follows_follower_idx" ON "follow" ("followerId")
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "follows_following_idx" ON "follow" ("followingId")
	`);

	tableReady = true;
}
