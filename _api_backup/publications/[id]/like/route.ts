import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, publications, likes } from '$lib/server/db/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

		const userId = session.user.id;
		const publicationId = params.id;

		// Get current publication first
		const [pub] = await db.select({ likeCount: publications.likeCount })
			.from(publications)
			.where(eq(publications.id, publicationId))
			.limit(1);

		if (!pub) return json({ error: 'Publication not found' }, { status: 404 });

		// Check if already liked
		const [existing] = await db.select({ id: likes.id })
			.from(likes)
			.where(and(eq(likes.userId, userId), eq(likes.publicationId, publicationId)))
			.limit(1);

		if (existing) {
			// Unlike
			await db.delete(likes).where(eq(likes.id, existing.id));
			await db.update(publications)
				.set({ likeCount: Math.max(0, pub.likeCount - 1) })
				.where(eq(publications.id, publicationId));
			return json({ liked: false });
		} else {
			// Like
			await db.insert(likes).values({
				id: randomUUID(),
				userId,
				publicationId,
			});
			await db.update(publications)
				.set({ likeCount: pub.likeCount + 1 })
				.where(eq(publications.id, publicationId));
			return json({ liked: true });
		}
	} catch (error) {
		console.error('POST /api/publications/[id]/like error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
