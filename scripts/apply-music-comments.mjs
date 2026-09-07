import { readFileSync } from "node:fs";
import postgres from "postgres";

const env = readFileSync(".env", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) throw new Error("DATABASE_URL missing");
const url = match[1].trim().replace(/^['"]|['"]$/g, "");

const sql = postgres(url, { max: 1 });
await sql.unsafe(`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "commentsCount" integer DEFAULT 0 NOT NULL`);
await sql.unsafe(`
CREATE TABLE IF NOT EXISTS "music_comment" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "musicId" text NOT NULL REFERENCES "music"("id") ON DELETE CASCADE,
  "text" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
)`);
await sql.unsafe(`CREATE INDEX IF NOT EXISTS "music_comments_music_created_idx" ON "music_comment" ("musicId", "createdAt")`);
await sql.unsafe(`CREATE INDEX IF NOT EXISTS "music_comments_user_idx" ON "music_comment" ("userId")`);
console.log("comments schema ready");
await sql.end();
