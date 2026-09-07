import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
	await sql`ALTER TABLE music ADD COLUMN IF NOT EXISTS "alignedLyrics" json`;
	console.log('alignedLyrics column ready');
} finally {
	await sql.end({ timeout: 5 });
}
