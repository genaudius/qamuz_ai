import { db } from "$lib/server/db/index.js";
import { music } from "$lib/server/db/schema.js";
import { eq, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types.js";

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const session = await locals.auth();
        if (!session?.user?.id) {
            return { songs: [] };
        }

        const songs = await db
            .select()
            .from(music)
            .where(eq(music.userId, session.user.id))
            .orderBy(desc(music.createdAt));

        return { songs };
    } catch (e) {
        console.error("Error loading library songs:", e);
        return { songs: [] };
    }
};
