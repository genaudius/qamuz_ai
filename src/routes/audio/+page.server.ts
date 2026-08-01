import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { isDemoModeEnabled } from '$lib/constants/demo-mode.js';
import { db } from "$lib/server/db/index.js";
import { music } from "$lib/server/db/schema.js";
import { eq, desc } from "drizzle-orm";

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user) {
		throw redirect(302, '/login');
	}

	let songs: any[] = [];
	try {
		songs = await db
			.select()
			.from(music)
			.where(eq(music.userId, session.user.id))
			.orderBy(desc(music.createdAt));
	} catch (e) {
		console.error("Error loading library songs in audio route:", e);
	}

	return {
		isDemoMode: isDemoModeEnabled(),
		songs
	};
};
