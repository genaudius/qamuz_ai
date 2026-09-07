-- Public YouTube-style comments + commentsCount on music.

ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "commentsCount" integer DEFAULT 0 NOT NULL;

CREATE TABLE IF NOT EXISTS "music_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
	"musicId" text NOT NULL REFERENCES "music"("id") ON DELETE CASCADE,
	"text" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "music_comments_music_created_idx" ON "music_comment" ("musicId", "createdAt");
CREATE INDEX IF NOT EXISTS "music_comments_user_idx" ON "music_comment" ("userId");
