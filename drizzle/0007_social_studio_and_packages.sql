-- Canonical social + studio tables that used to be created at runtime.
-- Idempotent: safe on databases that already ran the old ensure*() helpers.

ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "genre" text;
ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "tags" json DEFAULT '[]'::json NOT NULL;

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
);

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
	"updatedAt" = now();

CREATE TABLE IF NOT EXISTS "music_like" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"musicId" text NOT NULL REFERENCES "music"("id") ON DELETE CASCADE,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "music_like_user_track_unique" ON "music_like" ("userId", "musicId");
CREATE INDEX IF NOT EXISTS "music_likes_user_idx" ON "music_like" ("userId");
CREATE INDEX IF NOT EXISTS "music_likes_music_idx" ON "music_like" ("musicId");

CREATE TABLE IF NOT EXISTS "artist_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
	"stageName" text,
	"bio" text,
	"avatarUrl" text,
	"bannerUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "stageName" text;
ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "avatarUrl" text;
ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "artist_profile" ADD COLUMN IF NOT EXISTS "bannerUrl" text;
CREATE INDEX IF NOT EXISTS "artist_profiles_user_idx" ON "artist_profile" ("userId");

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
);
CREATE INDEX IF NOT EXISTS "artist_user_idx" ON "artist" ("userId");
CREATE INDEX IF NOT EXISTS "artist_verification_token_idx" ON "artist" ("verificationToken");

CREATE TABLE IF NOT EXISTS "follow" (
	"id" text PRIMARY KEY NOT NULL,
	"followerId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"followingId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "follow_pair_unique" ON "follow" ("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "follows_follower_idx" ON "follow" ("followerId");
CREATE INDEX IF NOT EXISTS "follows_following_idx" ON "follow" ("followingId");

CREATE TABLE IF NOT EXISTS "playlist" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"description" text,
	"isPublic" boolean NOT NULL DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "playlist_user_idx" ON "playlist" ("userId");

CREATE TABLE IF NOT EXISTS "playlist_item" (
	"id" text PRIMARY KEY NOT NULL,
	"playlistId" text NOT NULL REFERENCES "playlist"("id") ON DELETE CASCADE,
	"musicId" text REFERENCES "music"("id") ON DELETE CASCADE,
	"position" integer NOT NULL DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "playlist_item" ADD COLUMN IF NOT EXISTS "musicId" text;
ALTER TABLE "playlist_item" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0;
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_name = 'playlist_item' AND column_name = 'publicationId'
	) THEN
		ALTER TABLE "playlist_item" ALTER COLUMN "publicationId" DROP NOT NULL;
	END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "playlist_item_music_unique"
	ON "playlist_item" ("playlistId", "musicId")
	WHERE "musicId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "playlist_item_playlist_idx" ON "playlist_item" ("playlistId");
CREATE INDEX IF NOT EXISTS "playlist_item_music_idx" ON "playlist_item" ("musicId");

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
);
CREATE INDEX IF NOT EXISTS "master_job_user_created_idx" ON "master_job" ("userId", "createdAt");

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
);
CREATE UNIQUE INDEX IF NOT EXISTS "daw_session_user_name_unique" ON "daw_session" ("userId", "name");
CREATE INDEX IF NOT EXISTS "daw_session_user_updated_idx" ON "daw_session" ("userId", "updatedAt");
