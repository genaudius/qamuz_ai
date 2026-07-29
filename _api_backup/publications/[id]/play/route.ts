import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, publications } from '$lib/server/db/index.js';
import { eq, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params }) => {
	try {
		await db.update(publications)
			.set({ playCount: sql`${publications.playCount} + 1` })
			.where(eq(publications.id, params.id));
		return json({ success: true });
	} catch {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
