import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { music, musicComments, users } from '$lib/server/db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import { isDemoModeRestricted, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';
import { canStreamMusic, isMusicUuid } from '$lib/server/media-access.js';

const MAX_LEN = 500;

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const session = await locals.auth();
	const musicId = params.id;
	if (!musicId || !isMusicUuid(musicId)) {
		return json({ error: 'Invalid music ID' }, { status: 400 });
	}

	const limit = Math.min(80, Math.max(1, Number(url.searchParams.get('limit') || 40)));

	try {
		const [track] = await db
			.select({
				id: music.id,
				isPublic: music.isPublic,
				userId: music.userId,
				commentsCount: music.commentsCount
			})
			.from(music)
			.where(eq(music.id, musicId))
			.limit(1);

		if (!track) {
			return json({ error: 'No encontré esa canción' }, { status: 404 });
		}
		if (!canStreamMusic(track, session?.user?.id)) {
			return json({ error: 'No puedes ver estos comentarios' }, { status: 403 });
		}

		if (!track.isPublic) {
			return json({
				comments: [],
				commentsCount: 0,
				isPublic: false,
				message: 'Publica la canción para activar comentarios'
			});
		}

		const rows = await db
			.select({
				id: musicComments.id,
				text: musicComments.text,
				createdAt: musicComments.createdAt,
				userId: musicComments.userId,
				userName: users.name,
				userImage: users.image
			})
			.from(musicComments)
			.innerJoin(users, eq(users.id, musicComments.userId))
			.where(eq(musicComments.musicId, musicId))
			.orderBy(desc(musicComments.createdAt))
			.limit(limit);

		return json({
			isPublic: true,
			commentsCount: track.commentsCount ?? rows.length,
			comments: rows.map((row) => ({
				id: row.id,
				text: row.text,
				at: row.createdAt?.getTime?.() ?? Date.now(),
				user: {
					id: row.userId,
					name: row.userName || 'Usuario',
					image: row.userImage || null
				}
			}))
		});
	} catch (error) {
		console.error('List music comments error:', error);
		return json({ error: 'No pude cargar los comentarios' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return json({ error: 'Inicia sesión para comentar' }, { status: 401 });
	}

	if (isDemoModeRestricted(true)) {
		return json({ error: DEMO_MODE_MESSAGES.GENERAL_RESTRICTION }, { status: 403 });
	}

	const musicId = params.id;
	if (!musicId || !isMusicUuid(musicId)) {
		return json({ error: 'Invalid music ID' }, { status: 400 });
	}

	let body: { text?: string } = {};
	try {
		body = await request.json();
	} catch {
		return json({ error: 'JSON inválido' }, { status: 400 });
	}

	const text = String(body.text || '').trim().slice(0, MAX_LEN);
	if (!text) {
		return json({ error: 'Escribe un comentario' }, { status: 400 });
	}

	try {
		const [track] = await db
			.select({
				id: music.id,
				isPublic: music.isPublic,
				userId: music.userId
			})
			.from(music)
			.where(eq(music.id, musicId))
			.limit(1);

		if (!track) {
			return json({ error: 'No encontré esa canción' }, { status: 404 });
		}
		if (!track.isPublic) {
			return json(
				{ error: 'Solo las canciones públicas reciben comentarios' },
				{ status: 403 }
			);
		}

		const [created] = await db
			.insert(musicComments)
			.values({
				userId: session.user.id,
				musicId,
				text
			})
			.returning({
				id: musicComments.id,
				text: musicComments.text,
				createdAt: musicComments.createdAt
			});

		await db
			.update(music)
			.set({ commentsCount: sql`${music.commentsCount} + 1` })
			.where(eq(music.id, musicId));

		const [updated] = await db
			.select({ commentsCount: music.commentsCount })
			.from(music)
			.where(eq(music.id, musicId))
			.limit(1);

		return json({
			comment: {
				id: created.id,
				text: created.text,
				at: created.createdAt?.getTime?.() ?? Date.now(),
				user: {
					id: session.user.id,
					name: session.user.name || 'Usuario',
					image: session.user.image || null
				}
			},
			commentsCount: updated?.commentsCount ?? 1
		});
	} catch (error) {
		console.error('Create music comment error:', error);
		return json({ error: 'No pude publicar el comentario' }, { status: 500 });
	}
};
