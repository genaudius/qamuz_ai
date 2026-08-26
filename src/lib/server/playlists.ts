import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';

let tableReady = false;

/** Create playlist tables if this database never got the migration, and
 *  add musicId if an older publication-based playlist_item is still around. */
export async function ensurePlaylistTables(): Promise<void> {
	if (tableReady) return;

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
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "playlist_user_idx" ON "playlist" ("userId")
	`);
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "playlist_item" (
			"id" text PRIMARY KEY NOT NULL,
			"playlistId" text NOT NULL REFERENCES "playlist"("id") ON DELETE CASCADE,
			"musicId" text REFERENCES "music"("id") ON DELETE CASCADE,
			"position" integer NOT NULL DEFAULT 0,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		ALTER TABLE "playlist_item" ADD COLUMN IF NOT EXISTS "musicId" text
	`);
	await db.execute(sql`
		ALTER TABLE "playlist_item" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0
	`);
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
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "playlist_item_playlist_idx" ON "playlist_item" ("playlistId")
	`);

	tableReady = true;
}
