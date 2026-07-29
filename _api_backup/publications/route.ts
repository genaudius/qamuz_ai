import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db, publications, users, artistProfiles } from '$lib/server/db/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const session = await locals.auth();
		const type = url.searchParams.get('type') as 'music' | 'video' | 'image' | null;
		const isPublic = url.searchParams.get('public') === 'true';
		const userId = url.searchParams.get('userId');
		const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
		const offset = parseInt(url.searchParams.get('offset') ?? '0');

		// Build query conditions
		const conditions = [];

		if (type) conditions.push(eq(publications.type, type));
		if (isPublic) conditions.push(eq(publications.isPublic, true));
		if (userId) conditions.push(eq(publications.userId, userId));
		// If not requesting public or specific user, require auth and return own
		if (!isPublic && !userId) {
			if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
			conditions.push(eq(publications.userId, session.user.id));
		}

		const rows = await db
			.select({
				id: publications.id,
				userId: publications.userId,
				type: publications.type,
				title: publications.title,
				description: publications.description,
				audioUrl: publications.audioUrl,
				videoUrl: publications.videoUrl,
				coverUrl: publications.coverUrl,
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
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(publications.createdAt))
			.limit(limit)
			.offset(offset);

		return json({ publications: rows });
	} catch (error) {
		console.error('GET /api/publications error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const body = await request.json();
		const {
			type,
			title,
			description,
			prompt,
			audioUrl,
			videoUrl,
			coverUrl,
			lyrics,
			tags,
			model,
			durationMs,
			isInstrumental = false,
			externalId,
			musicId,
			videoId,
			imageId,
			isPublic = false,
		} = body;

		if (!type || !['music', 'video', 'image'].includes(type)) {
			return json({ error: 'Invalid type. Must be music, video, or image.' }, { status: 400 });
		}
		if (!title?.trim()) {
			return json({ error: 'Title is required' }, { status: 400 });
		}

		const [publication] = await db.insert(publications).values({
			id: randomUUID(),
			userId: session.user.id,
			type,
			title: title.trim(),
			description: description?.trim() || null,
			prompt: prompt?.trim() || null,
			audioUrl: audioUrl || null,
			videoUrl: videoUrl || null,
			coverUrl: coverUrl || null,
			lyrics: lyrics || null,
			tags: tags || null,
			model: model || null,
			durationMs: durationMs ? Number(durationMs) : null,
			isInstrumental: Boolean(isInstrumental),
			externalId: externalId || null,
			musicId: musicId || null,
			videoId: videoId || null,
			imageId: imageId || null,
			isPublic: Boolean(isPublic),
		}).returning();

		return json({ publication }, { status: 201 });
	} catch (error) {
		console.error('POST /api/publications error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
