import { db } from './src/lib/server/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Altering user table...');
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "creditsBalance" integer DEFAULT 0 NOT NULL;`);
    console.log('Done!');
    process.exit(0);
}

main().catch(console.error);
