import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';

let tableReady = false;

export async function ensureMusicLikeTable(): Promise<void> {
	if (tableReady) return;

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "music_like" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"musicId" text NOT NULL REFERENCES "music"("id") ON DELETE CASCADE,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS "music_like_user_track_unique"
		ON "music_like" ("userId", "musicId")
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "music_likes_user_idx" ON "music_like" ("userId")
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "music_likes_music_idx" ON "music_like" ("musicId")
	`);

	tableReady = true;
}
