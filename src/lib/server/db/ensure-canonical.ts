import { sql } from 'drizzle-orm';
import { db } from './index.js';

let ready = false;
let inFlight: Promise<void> | null = null;

/** One-shot bootstrap for databases that never ran drizzle migrate. Keep in sync with drizzle/0007_social_studio_and_packages.sql */
export async function ensureCanonicalSchema(): Promise<void> {
	if (ready) return;
	if (inFlight) return inFlight;

	inFlight = applyCanonicalSchema()
		.then(() => {
			ready = true;
		})
		.finally(() => {
			inFlight = null;
		});

	return inFlight;
}

async function applyCanonicalSchema(): Promise<void> {
	await db.execute(sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "genre" text`);
	await db.execute(sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "tags" json DEFAULT '[]'::json NOT NULL`);

	await db.execute(sql`
		DELETE FROM usage_tracking a
		USING usage_tracking b
		WHERE a."userId" = b."userId"
			AND a."month" = b."month"
			AND a."year" = b."year"
			AND a."id" < b."id"
	`);
	await db.execute(sql`
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'user_month_year_unique'
			) THEN
				ALTER TABLE "usage_tracking"
					ADD CONSTRAINT "user_month_year_unique" UNIQUE ("userId", "month", "year");
			END IF;
		END $$
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "credit_package" (
			"id" text PRIMARY KEY NOT NULL,
			"name" text NOT NULL,
			"credits" integer NOT NULL,
			"priceAmount" integer NOT NULL,
			"currency" text DEFAULT 'usd' NOT NULL,
			"badgeText" text,
			"isActive" boolean DEFAULT true NOT NULL,
			"createdAt" timestamp DEFAULT now() NOT NULL,
			"updatedAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		INSERT INTO "credit_package" ("id", "name", "credits", "priceAmount", "currency", "badgeText")
		VALUES
			('credits-100', '100 Credits', 100, 500, 'usd', NULL),
			('credits-250', '250 Credits', 250, 1000, 'usd', 'Best value'),
			('credits-600', '600 Credits', 600, 2000, 'usd', 'Most popular')
		ON CONFLICT ("id") DO UPDATE SET
			"name" = EXCLUDED."name",
			"credits" = EXCLUDED."credits",
			"priceAmount" = EXCLUDED."priceAmount",
			"currency" = EXCLUDED."currency",
			"badgeText" = EXCLUDED."badgeText",
			"isActive" = true,
			"updatedAt" = now()
	`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "music_like" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"musicId" text NOT NULL REFERENCES "music"("id") ON DELETE CASCADE,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "music_like_user_track_unique" ON "music_like" ("userId", "musicId")`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "music_likes_user_idx" ON "music_like" ("userId")`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "music_likes_music_idx" ON "music_like" ("musicId")`);

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
	await db.execute(sql`ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "stageName" text`);
	await db.execute(sql`ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "avatarUrl" text`);
	await db.execute(sql`ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "bio" text`);
	await db.execute(sql`ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "bannerUrl" text`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "artist_profiles_user_idx" ON "artist_profile" ("userId")`);

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
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "artist_user_idx" ON "artist" ("userId")`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "artist_verification_token_idx" ON "artist" ("verificationToken")`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "follow" (
			"id" text PRIMARY KEY NOT NULL,
			"followerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"followingId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "follow_pair_unique" ON "follow" ("followerId", "followingId")`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "follows_follower_idx" ON "follow" ("followerId")`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "follows_following_idx" ON "follow" ("followingId")`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "playlist" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"name" text NOT NULL,
			"description" text,
			"isPublic" boolean NOT NULL DEFAULT false,
			"createdAt" timestamp DEFAULT now() NOT NULL,
			"updatedAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "playlist_user_idx" ON "playlist" ("userId")`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "playlist_item" (
			"id" text PRIMARY KEY NOT NULL,
			"playlistId" text NOT NULL REFERENCES "playlist"("id") ON DELETE CASCADE,
			"musicId" text REFERENCES "music"("id") ON DELETE CASCADE,
			"position" integer NOT NULL DEFAULT 0,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`ALTER TABLE "playlist_item" ADD COLUMN IF NOT EXISTS "musicId" text`);
	await db.execute(sql`ALTER TABLE "playlist_item" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0`);
	await db.execute(sql`
		DO $$
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.columns
				WHERE table_name = 'playlist_item' AND column_name = 'publicationId'
			) THEN
				ALTER TABLE "playlist_item" ALTER COLUMN "publicationId" DROP NOT NULL;
			END IF;
		END $$
	`);
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS "playlist_item_music_unique"
		ON "playlist_item" ("playlistId", "musicId")
		WHERE "musicId" IS NOT NULL
	`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "playlist_item_playlist_idx" ON "playlist_item" ("playlistId")`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "playlist_item_music_idx" ON "playlist_item" ("musicId")`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "master_job" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"title" text NOT NULL,
			"sourceName" text,
			"sourceKind" text NOT NULL DEFAULT 'upload',
			"sourceMusicId" text,
			"style" text,
			"recipe" json,
			"peakDb" real,
			"lufs" real,
			"durationSec" real,
			"mimeType" text NOT NULL DEFAULT 'audio/wav',
			"fileSize" integer NOT NULL DEFAULT 0,
			"storageLocation" text NOT NULL DEFAULT 'local',
			"cloudPath" text,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "master_job_user_created_idx" ON "master_job" ("userId", "createdAt")`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "daw_session" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"name" text NOT NULL,
			"idea" text,
			"stage" text,
			"title" text,
			"audioUrl" text,
			"mixNotes" text,
			"snapshot" json,
			"createdAt" timestamp DEFAULT now() NOT NULL,
			"updatedAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "daw_session_user_name_unique" ON "daw_session" ("userId", "name")`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "daw_session_user_updated_idx" ON "daw_session" ("userId", "updatedAt")`);

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "daw_session_revision" (
			"id" text PRIMARY KEY NOT NULL,
			"sessionId" text NOT NULL REFERENCES "daw_session"("id") ON DELETE CASCADE,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"revision" integer NOT NULL,
			"action" text NOT NULL DEFAULT 'autosave',
			"snapshot" json NOT NULL,
			"createdAt" timestamp DEFAULT now() NOT NULL,
			CONSTRAINT "daw_session_revision_unique" UNIQUE("sessionId", "revision")
		)
	`);
	await db.execute(sql`CREATE INDEX IF NOT EXISTS "daw_session_revision_user_idx" ON "daw_session_revision" ("userId", "createdAt")`);
}
