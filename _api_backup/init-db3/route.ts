import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        await db.execute(sql`
            ALTER TABLE "user" ADD COLUMN "creditBalance" integer DEFAULT 0;
        `);
        return json({ success: true, message: "creditBalance field added" });
    } catch (err: any) {
        if (err.code === '42701') {
            return json({ success: true, message: "creditBalance field already exists" });
        }
        return json({ success: false, error: err.message }, { status: 500 });
    }
}
