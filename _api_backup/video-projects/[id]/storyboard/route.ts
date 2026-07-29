import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VideoSceneWithImage } from '$lib/server/db/schema.js';

// POST /api/video-projects/[id]/storyboard
// Generate images for all scenes (calls internal /api/image-generation for each)
export const POST: RequestHandler = async ({ params, request, locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));

	if (!project) return json({ error: 'Project not found' }, { status: 404 });
	if (!project.script?.length) return json({ error: 'Script not generated yet' }, { status: 400 });

	const body = await request.json() as { sceneIndex?: number };
	const scenes: VideoSceneWithImage[] = (project.scenes ?? project.script.map(s => ({
		...s,
		imageStatus: 'pending' as const,
	})));

	// Generate one scene at a time (called per-scene from frontend for progress)
	const targetIndex = body.sceneIndex ?? 0;
	const scene = scenes[targetIndex];
	if (!scene) return json({ error: 'Scene index out of range' }, { status: 400 });

	// Mark as generating
	scenes[targetIndex] = { ...scene, imageStatus: 'generating' };
	await db.update(videoProjects)
		.set({ scenes, updatedAt: new Date() })
		.where(eq(videoProjects.id, params.id));

	try {
		const origin = url.origin;
		const cfg = project.config as { platform?: string } | null;
		const aspectRatio = cfg?.platform === 'youtube' ? '16:9' : '9:16';

		// Retry up to 3 times with backoff to handle Replicate 429 rate limits
		let imgRes: Response | null = null;
		let lastErr = '';
		for (let attempt = 0; attempt < 3; attempt++) {
			imgRes = await fetch(`${origin}/api/image-generation`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: request.headers.get('Cookie') ?? '',
				},
				body: JSON.stringify({
					model: 'flux-schnell',
					prompt: [
						scene.prompt,
						scene.type === 'vocals'
							? 'close-up portrait, artist singing, dramatic studio lighting, music video'
							: 'wide establishing shot, cinematic atmosphere, music video',
						'professional photography, vibrant colors, 8k quality',
					].join(', '),
					size: aspectRatio,
				}),
			});
			if (imgRes.ok) break;
			const errJson = await imgRes.json().catch(() => ({ error: 'Unknown', retry_after: 10 })) as { error?: string; retry_after?: number };
			lastErr = errJson.error || `Image generation failed: ${imgRes.status}`;
			// On 429, wait retry_after seconds then retry; on any other error, fail immediately
			if (imgRes.status === 429) {
				// Rate limited — wait retry_after time
				const waitMs = Math.min((errJson.retry_after ?? 10) * 1000, 60_000);
				await new Promise(r => setTimeout(r, waitMs + 1000));
			} else if (imgRes.status === 402) {
				// Insufficient credit — possibly just added, wait 20s and retry
				await new Promise(r => setTimeout(r, 20_000));
			} else {
				throw new Error(lastErr);
			}
		}
		if (!imgRes?.ok) throw new Error(lastErr || 'Image generation failed after retries');

		const imgData = await imgRes.json() as { imageId?: string; imageUrl?: string };
		const imageUrl = imgData.imageUrl ?? (imgData.imageId ? `/api/images/${imgData.imageId}` : '');

		// Update scene with image
		scenes[targetIndex] = { ...scene, imageUrl, imageStatus: 'done' };

		// Check if all scenes are done
		const allDone = scenes.every(s => s.imageStatus === 'done');
		await db.update(videoProjects)
			.set({
				scenes,
				status: allDone ? 'rendering' : 'storyboard',
				updatedAt: new Date(),
			})
			.where(eq(videoProjects.id, params.id));

		return json({ scene: scenes[targetIndex], allDone });

	} catch (err) {
		scenes[targetIndex] = { ...scene, imageStatus: 'error' };
		await db.update(videoProjects)
			.set({ scenes, updatedAt: new Date() })
			.where(eq(videoProjects.id, params.id));
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
