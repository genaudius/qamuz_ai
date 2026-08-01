import postgres from 'postgres';

async function run() {
  const sql = postgres("postgres://postgres:postgres@localhost:5432/qamuz_ai");
  try {
    await sql`ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "lyrics" text`;
    console.log("Successfully added lyrics column to music table");
  } catch (err) {
    console.error("Error migrating db:", err);
  } finally {
    await sql.end();
  }
}

run();
