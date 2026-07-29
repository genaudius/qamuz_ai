import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, publications, users } from '$lib/server/db/index.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const [row] = await db
			.select({
				id: publications.id,
				userId: publications.userId,
				type: publications.type,
				title: publications.title,
				description: publications.description,
				prompt: publications.prompt,
				audioUrl: publications.audioUrl,
				videoUrl: publications.videoUrl,
				coverUrl: publications.coverUrl,
				lyrics: publications.lyrics,
				tags: publications.tags,
				model: publications.model,
				durationMs: publications.durationMs,
				isInstrumental: publications.isInstrumental,
				isPublic: publications.isPublic,
				playCount: publications.playCount,
				likeCount: publications.likeCount,
				createdAt: publications.createdAt,
				artistName: users.name,
				artistImage: users.image,
			})
			.from(publications)
			.leftJoin(users, eq(users.id, publications.userId))
			.where(eq(publications.id, params.id))
			.limit(1);

		if (!row) return json({ error: 'Not found' }, { status: 404 });

		// Private publications only accessible to owner
		const session = await locals.auth();
		if (!row.isPublic && row.userId !== session?.user?.id) {
			return json({ error: 'Not found' }, { status: 404 });
		}

		return json({ publication: row });
	} catch (error) {
		console.error('GET /api/publications/[id] error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ request, params, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

		const [pub] = await db.select({ userId: publications.userId })
			.from(publications)
			.where(eq(publications.id, params.id))
			.limit(1);

		if (!pub) return json({ error: 'Not found' }, { status: 404 });
		if (pub.userId !== session.user.id) return json({ error: 'Forbidden' }, { status: 403 });

		const body = await request.json();
		const allowed = ['title', 'description', 'coverUrl', 'isPublic', 'tags'] as const;
		const updates: Record<string, unknown> = { updatedAt: new Date() };
		for (const key of allowed) {
			if (key in body) updates[key] = body[key];
		}

		const [updated] = await db.update(publications)
			.set(updates)
			.where(eq(publications.id, params.id))
			.returning();

		return json({ publication: updated });
	} catch (error) {
		console.error('PATCH /api/publications/[id] error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

		const [pub] = await db.select({ userId: publications.userId, isAdmin: users.isAdmin })
			.from(publications)
			.leftJoin(users, eq(users.id, session.user.id))
			.where(eq(publications.id, params.id))
			.limit(1);

		if (!pub) return json({ error: 'Not found' }, { status: 404 });
		if (pub.userId !== session.user.id && !pub.isAdmin) {
			return json({ error: 'Forbidden' }, { status: 403 });
		}

		await db.delete(publications).where(eq(publications.id, params.id));
		return json({ success: true });
	} catch (error) {
		console.error('DELETE /api/publications/[id] error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
