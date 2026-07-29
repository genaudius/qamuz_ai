import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        await db.execute(sql`
            ALTER TABLE "user" 
            ADD COLUMN "autoTopupEnabled" boolean NOT NULL DEFAULT false,
            ADD COLUMN "autoTopupAmount" integer,
            ADD COLUMN "autoTopupCredits" integer;
        `);
        return json({ success: true, message: "autoTopup fields added to 'user' table successfully." });
    } catch (err: any) {
        if (err.code === '42701') {
            return json({ success: true, message: "autoTopup fields already exist. Skipping." });
        }
        return json({ success: false, error: err.message }, { status: 500 });
    }
}
