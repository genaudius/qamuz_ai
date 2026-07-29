import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "notification" (
                "id" text PRIMARY KEY NOT NULL,
                "userId" text NOT NULL,
                "type" text DEFAULT 'system' NOT NULL,
                "title" text NOT NULL,
                "message" text NOT NULL,
                "link" text,
                "isRead" boolean DEFAULT false NOT NULL,
                "createdAt" timestamp DEFAULT now() NOT NULL
            );
        `);
        
        try {
            await db.execute(sql`
                ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
            `);
        } catch(e) {
            console.log("Foreign key might exist", e);
        }
        
        return new Response("OK");
    } catch(e: any) {
        return new Response(e.toString(), { status: 500 });
    }
}
