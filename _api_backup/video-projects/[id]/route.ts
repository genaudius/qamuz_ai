import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VideoScene, VideoSceneWithImage, VideoClip } from '$lib/server/db/schema.js';

// GET — load project state
export const GET: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));

	if (!project) return json({ error: 'Not found' }, { status: 404 });

	return json({ ...project, createdAt: project.createdAt.toISOString(), updatedAt: project.updatedAt.toISOString() });
};

// PATCH — update project state (used by frontend after each step)
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const body = await request.json() as Partial<{
		status: string;
		script: VideoScene[];
		scenes: VideoSceneWithImage[];
		clips: VideoClip[];
		finalVideoUrl: string;
		errorMessage: string;
	}>;

	await db.update(videoProjects)
		.set({ ...body, updatedAt: new Date() } as typeof videoProjects.$inferInsert)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));

	return json({ ok: true });
};

// DELETE — remove project
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	await db.delete(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));

	return json({ ok: true });
};
