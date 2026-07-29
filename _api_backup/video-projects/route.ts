import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects, publications } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

// GET  — list user's video projects
export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const rows = await db.select().from(videoProjects)
		.where(eq(videoProjects.userId, session.user.id))
		.orderBy(desc(videoProjects.createdAt))
		.limit(20);

	return json({ projects: rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })) });
};

// POST — create new video project from a publication/track
export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const { publicationId, config } = await request.json() as { publicationId: string; config?: { platform: string; durationSec: number; hookText?: string } };
	if (!publicationId) return json({ error: 'publicationId required' }, { status: 400 });

	// Load track data
	const [pub] = await db.select().from(publications)
		.where(eq(publications.id, publicationId));
	if (!pub) return json({ error: 'Track not found' }, { status: 404 });
	if (pub.userId !== session.user.id) return json({ error: 'Forbidden' }, { status: 403 });

	// Check for existing project for this track
	const [existing] = await db.select({ id: videoProjects.id })
		.from(videoProjects)
		.where(eq(videoProjects.publicationId, publicationId));

	if (existing) {
		// Update config if provided (user may change platform/duration on retry)
		if (config) {
			await db.update(videoProjects).set({ config, updatedAt: new Date() }).where(eq(videoProjects.id, existing.id));
		}
		return json({ projectId: existing.id, existing: true });
	}

	const [project] = await db.insert(videoProjects).values({
		userId: session.user.id,
		publicationId,
		title: pub.title,
		audioUrl: pub.audioUrl,
		coverUrl: pub.coverUrl,
		lyrics: pub.prompt ?? '',
		style: pub.tags ?? '',
		prompt: pub.prompt ?? '',
		config: config ?? { platform: 'reels', durationSec: 30 },
		status: 'script',
	}).returning({ id: videoProjects.id });

	return json({ projectId: project.id, existing: false });
};
