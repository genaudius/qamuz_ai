const postgres = require('postgres');

async function main() {
  const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/drizzle";
  const sql = postgres(connectionString);

  try {
    console.log("Adding columns to music table...");
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "title" text;`;
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "isPublic" boolean DEFAULT false NOT NULL;`;
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "likesCount" integer DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "playsCount" integer DEFAULT 0 NOT NULL;`;
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "imageUrl" text;`;
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "videoUrl" text;`;
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "lyrics" text;`;
    console.log("Columns added successfully!");
    
    console.log("Adding unique constraints (ignoring errors if already exist)...");
    try {
        await sql`ALTER TABLE "betterAuthAccount" ADD CONSTRAINT "better_auth_account_provider_account_unique" UNIQUE("accountId","providerId");`;
    } catch (e) {
        console.log("betterAuthAccount constraint issue: " + e.message);
    }
    
    try {
        await sql`ALTER TABLE "usage_tracking" ADD CONSTRAINT "user_month_year_unique" UNIQUE("userId","month","year");`;
    } catch (e) {
        console.log("usage_tracking constraint issue: " + e.message);
    }

    console.log("Done!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await sql.end();
  }
}

main();
