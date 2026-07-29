import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VideoClip } from '$lib/server/db/schema.js';
import { env } from '$env/dynamic/private';
import { getReplicateClient, fetchImageAsDataUri } from '$lib/ai/providers/replicate.js';

// POST /api/video-projects/[id]/render
export const POST: RequestHandler = async ({ params, request, locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));

	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const body = await request.json() as { sceneIndex: number };
	const clips: VideoClip[] = (project.clips ?? project.scenes?.map(s => ({
		...s,
		clipStatus: 'pending' as const,
	}))) ?? [];

	const targetIndex = body.sceneIndex;
	const scene = project.scenes?.[targetIndex];
	if (!scene) return json({ error: 'Scene not found' }, { status: 400 });
	if (!scene.imageUrl) return json({ error: 'Scene image not generated yet' }, { status: 400 });

	const cfg = project.config as { platform?: string } | null;
	const aspectRatio = cfg?.platform === 'youtube' ? '16:9' : '9:16';
	// ray-flash-2-720p only accepts exactly 5 or 9 seconds
	const sceneDur = Math.round(scene.endSec - scene.startSec);
	const duration = sceneDur >= 7 ? 9 : 5;

	const videoPrompt = [
		scene.prompt,
		scene.cameraMovement ?? 'smooth cinematic camera movement',
		'music video aesthetic, high quality motion',
	].join(', ');

	// ── ASYNC PATH (webhook) ─────────────────────────────────────────────────
	const webhookBase = env.REPLICATE_WEBHOOK_BASE_URL || env.ORIGIN;
	if (webhookBase && !webhookBase.includes('localhost') && !webhookBase.includes('127.0.0.1')) {
		try {
			// Mark as generating
			clips[targetIndex] = { ...scene, clipStatus: 'generating' };
			await db.update(videoProjects)
				.set({ clips, updatedAt: new Date() })
				.where(eq(videoProjects.id, params.id));

			const client = await getReplicateClient();

			// Convert internal image URL to data URI so Replicate can access it
			const startImage = await fetchImageAsDataUri(scene.imageUrl);

			const webhookUrl = `${webhookBase}/api/webhooks/replicate?projectId=${params.id}&sceneIndex=${targetIndex}&userId=${session.user.id}`;

			 
			let prediction;
			let lastAsyncErr = '';
			for (let attempt = 0; attempt < 4; attempt++) {
				try {
					prediction = await (client as any).predictions.create({
						model: 'luma/ray-flash-2-720p',
						input: {
							prompt: videoPrompt,
							start_image_url: startImage,
							duration,
							aspect_ratio: aspectRatio,
						},
						webhook: webhookUrl,
						webhook_events_filter: ['completed'],
					});
					break;
				} catch (err: any) {
					const errMsg = err instanceof Error ? err.message : String(err);
					lastAsyncErr = errMsg;
					if (errMsg.includes('"status":429') || errMsg.includes('status 429') || errMsg.includes('429 Too Many Requests')) {
						let waitMs = 10000;
						const match = errMsg.match(/"retry_after":\s*(\d+)/);
						if (match && match[1]) {
							waitMs = parseInt(match[1]) * 1000;
						}
						console.warn(`[render] Async Rate limited, waiting ${waitMs}ms before retry...`);
						await new Promise(r => setTimeout(r, waitMs + 2000));
					} else if (errMsg.includes('"status":402') || errMsg.includes('status 402') || errMsg.includes('Payment Required')) {
						await new Promise(r => setTimeout(r, 25_000));
					} else {
						throw err;
					}
				}
			}

			if (!prediction) throw new Error(lastAsyncErr || 'Async prediction failed after retries');

			// Store taskId so frontend can poll
			clips[targetIndex] = { ...scene, clipStatus: 'generating', taskId: prediction.id };
			await db.update(videoProjects)
				.set({ clips, updatedAt: new Date() })
				.where(eq(videoProjects.id, params.id));

			console.log(`[render] Async prediction started: ${prediction.id} for scene ${targetIndex}`);
			return json({ pending: true, taskId: prediction.id });

		} catch (err) {
			console.error('[render] Async prediction failed, falling back to sync:', err);
			// Fall through to sync path below
		}
	}

	// ── SYNC PATH (fallback for localhost / no webhook URL) ──────────────────
	// Mark as generating
	clips[targetIndex] = { ...scene, clipStatus: 'generating' };
	await db.update(videoProjects)
		.set({ clips, updatedAt: new Date() })
		.where(eq(videoProjects.id, params.id));

	try {
		const origin = url.origin;

		// Retry up to 4 times for Replicate 429/402 rate limits
		let videoRes: Response | null = null;
		let lastVideoErr = '';
		for (let attempt = 0; attempt < 4; attempt++) {
			videoRes = await fetch(`${origin}/api/video-generation`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: request.headers.get('Cookie') ?? '',
				},
				body: JSON.stringify({
					model: 'ray-flash-2-720p',
					prompt: videoPrompt,
					imageUrl: scene.imageUrl,
					duration,
					resolution: aspectRatio,
				}),
			});
			if (videoRes.ok) break;
			const errJson = await videoRes.json().catch(() => ({ error: 'Unknown', retry_after: 10 })) as { error?: string; retry_after?: number };
			lastVideoErr = errJson.error || `Video render failed: ${videoRes.status}`;
			
			if (videoRes.status === 429 || lastVideoErr.includes('"status":429') || lastVideoErr.includes('status 429') || lastVideoErr.includes('429 Too Many Requests')) {
				let waitMs = 10000;
				const match = lastVideoErr.match(/"retry_after":\s*(\d+)/);
				if (match && match[1]) {
					waitMs = parseInt(match[1]) * 1000;
				} else if (errJson.retry_after) {
					waitMs = errJson.retry_after * 1000;
				}
				console.warn(`[render] Sync Rate limited, waiting ${waitMs}ms before retry...`);
				await new Promise(r => setTimeout(r, waitMs + 2000));
			} else if (videoRes.status === 402 || lastVideoErr.includes('"status":402') || lastVideoErr.includes('status 402') || lastVideoErr.includes('Payment Required')) {
				await new Promise(r => setTimeout(r, 25_000));
			} else {
				throw new Error(lastVideoErr);
			}
		}
		if (!videoRes?.ok) throw new Error(lastVideoErr || 'Video render failed after retries');

		const videoData = await videoRes.json() as { videoId?: string; videoUrl?: string; url?: string; taskId?: string };

		if (videoData.taskId) {
			clips[targetIndex] = { ...scene, clipStatus: 'generating', taskId: videoData.taskId };
			await db.update(videoProjects)
				.set({ clips, updatedAt: new Date() })
				.where(eq(videoProjects.id, params.id));
			return json({ pending: true, taskId: videoData.taskId });
		}

		const clipUrl = videoData.videoUrl ?? videoData.url
			?? (videoData.videoId ? `/api/videos/${videoData.videoId}` : '');
		clips[targetIndex] = { ...scene, clipUrl, clipStatus: 'done' };

		const allDone = clips.every(c => c.clipStatus === 'done');
		await db.update(videoProjects)
			.set({ clips, status: allDone ? 'editor' : 'rendering', updatedAt: new Date() })
			.where(eq(videoProjects.id, params.id));

		return json({ clipUrl, allDone });

	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		if (clips[targetIndex]) {
			clips[targetIndex] = { ...(clips[targetIndex] as VideoClip), clipStatus: 'error' };
			await db.update(videoProjects)
				.set({ clips, updatedAt: new Date() })
				.where(eq(videoProjects.id, params.id));
		}
		return json({ error: msg }, { status: 500 });
	}
};
