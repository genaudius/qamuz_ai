import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, follows } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

		const followerId = session.user.id;
		const followingId = params.id;

		if (followerId === followingId) {
			return json({ error: 'Cannot follow yourself' }, { status: 400 });
		}

		const [existing] = await db.select({ id: follows.id })
			.from(follows)
			.where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
			.limit(1);

		if (existing) {
			await db.delete(follows).where(eq(follows.id, existing.id));
			return json({ following: false });
		} else {
			await db.insert(follows).values({
				id: randomUUID(),
				followerId,
				followingId,
			});
			return json({ following: true });
		}
	} catch (error) {
		console.error('Follow error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
