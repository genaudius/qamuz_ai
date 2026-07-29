import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

// Quality tiers per plan — resolution label only (upscaling is a separate pipeline feature)
const PLAN_QUALITIES: Record<string, { id: string; label: string; badge: string; locked: boolean }[]> = {
	free:     [
		{ id: '720p',  label: '720p HD',  badge: 'HD',  locked: false },
		{ id: '1080p', label: '1080p FHD', badge: 'FHD', locked: true },
		{ id: '4k',    label: '4K UHD',    badge: '4K',  locked: true },
		{ id: '8k',    label: '8K UHD',    badge: '8K',  locked: true },
	],
	starter:  [
		{ id: '720p',  label: '720p HD',  badge: 'HD',  locked: false },
		{ id: '1080p', label: '1080p FHD', badge: 'FHD', locked: false },
		{ id: '4k',    label: '4K UHD',    badge: '4K',  locked: true },
		{ id: '8k',    label: '8K UHD',    badge: '8K',  locked: true },
	],
	pro:      [
		{ id: '720p',  label: '720p HD',  badge: 'HD',  locked: false },
		{ id: '1080p', label: '1080p FHD', badge: 'FHD', locked: false },
		{ id: '4k',    label: '4K UHD',    badge: '4K',  locked: false },
		{ id: '8k',    label: '8K UHD',    badge: '8K',  locked: true },
	],
	advanced: [
		{ id: '720p',  label: '720p HD',  badge: 'HD',  locked: false },
		{ id: '1080p', label: '1080p FHD', badge: 'FHD', locked: false },
		{ id: '4k',    label: '4K UHD',    badge: '4K',  locked: false },
		{ id: '8k',    label: '8K UHD',    badge: '8K',  locked: false },
	],
};

// GET /api/export/download?projectId=xxx — returns available qualities for user plan
export const GET: RequestHandler = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const projectId = url.searchParams.get('projectId');
	if (!projectId) return json({ error: 'projectId required' }, { status: 400 });

	const [user] = await db.select({ planTier: users.planTier })
		.from(users).where(eq(users.id, session.user.id));

	const plan = user?.planTier ?? 'free';
	const qualities = PLAN_QUALITIES[plan] ?? PLAN_QUALITIES.free;

	return json({ plan, qualities });
};

// POST /api/export/download — initiate download (returns redirect URL to video)
export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const body = await request.json() as { projectId: string; quality: string };
	const { projectId, quality } = body;

	// Check plan allows the requested quality
	const [user] = await db.select({ planTier: users.planTier })
		.from(users).where(eq(users.id, session.user.id));
	const plan = user?.planTier ?? 'free';
	const qualities = PLAN_QUALITIES[plan] ?? PLAN_QUALITIES.free;
	const tier = qualities.find(q => q.id === quality);
	if (!tier) return json({ error: 'Invalid quality' }, { status: 400 });
	if (tier.locked) return json({ error: `${quality} requires a higher plan. Upgrade to download at this quality.`, upgrade: true }, { status: 403 });

	// Load project
	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, projectId), eq(videoProjects.userId, session.user.id)));
	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const clips = (project.clips as { clipUrl?: string; clipStatus?: string }[]) ?? [];
	const firstClip = clips.find(c => c.clipStatus === 'done' && c.clipUrl);
	const videoUrl = project.finalVideoUrl ?? firstClip?.clipUrl;
	if (!videoUrl) return json({ error: 'No video ready' }, { status: 400 });

	// For now, return the video URL (upscaling pipeline is a future enhancement)
	// In production, quality > 720p would trigger an upscaling job
	return json({ downloadUrl: videoUrl, quality, note: quality !== '720p' ? 'Upscaling pipeline coming soon — downloading available quality.' : undefined });
};
