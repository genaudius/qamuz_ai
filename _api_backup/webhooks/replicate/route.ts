import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { saveVideoAndGetId } from '$lib/ai/utils.js';
import type { VideoClip } from '$lib/server/db/schema.js';
import { env } from '$env/dynamic/private';
import { createHmac, timingSafeEqual } from 'crypto';

// Verify Replicate webhook HMAC-SHA256 signature
async function verifySignature(request: Request, secret: string): Promise<boolean> {
	const webhookId        = request.headers.get('webhook-id') ?? '';
	const webhookTimestamp = request.headers.get('webhook-timestamp') ?? '';
	const webhookSignature = request.headers.get('webhook-signature') ?? '';
	const body = await request.clone().text();

	const signedContent = `${webhookId}.${webhookTimestamp}.${body}`;
	const computed = createHmac('sha256', Buffer.from(secret, 'base64'))
		.update(signedContent)
		.digest('base64');
	const expected = `v1,${computed}`;

	// webhook-signature may contain multiple space-separated sigs ("v1,abc v1,xyz")
	return webhookSignature.split(' ').some(sig => {
		try {
			return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
		} catch {
			return false;
		}
	});
}

// POST /api/webhooks/replicate?projectId=...&sceneIndex=...&userId=...
export const POST: RequestHandler = async ({ request, url }) => {
	// Verify signature if secret is configured
	const secret = env.REPLICATE_WEBHOOK_SECRET;
	if (secret) {
		const valid = await verifySignature(request, secret);
		if (!valid) {
			console.error('[replicate-webhook] Invalid signature');
			return json({ error: 'Invalid signature' }, { status: 401 });
		}
	}

	const projectId  = url.searchParams.get('projectId');
	const sceneIndex = parseInt(url.searchParams.get('sceneIndex') ?? '-1', 10);
	const userId     = url.searchParams.get('userId');

	if (!projectId || sceneIndex < 0 || !userId) {
		return json({ error: 'Missing projectId, sceneIndex, or userId' }, { status: 400 });
	}

	const body = await request.json() as {
		id: string;
		status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
		output?: string | string[] | null;
		error?: string | null;
	};

	console.log(`[replicate-webhook] prediction=${body.id} status=${body.status} project=${projectId} scene=${sceneIndex}`);

	// Load project
	const [project] = await db.select().from(videoProjects).where(eq(videoProjects.id, projectId));
	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const clips: VideoClip[] = (project.clips as VideoClip[]) ?? [];

	if (body.status === 'succeeded' && body.output) {
		try {
			// Replicate returns a URL (or array of URLs) to the generated video
			const outputUrl = Array.isArray(body.output) ? body.output[0] : body.output;

			// Download the video
			const dlRes = await fetch(outputUrl);
			if (!dlRes.ok) throw new Error(`Failed to download video: ${dlRes.status}`);
			const buffer = await dlRes.arrayBuffer();
			const base64 = Buffer.from(buffer).toString('base64');

			// Save to storage (S3/R2) + DB
			const videoId = await saveVideoAndGetId(
				base64,
				'video/mp4',
				userId,
				undefined, // chatId
				5,         // duration (approximate)
				'720p',
				24,
				false      // no audio
			);

			const clipUrl = `/api/videos/${videoId}`;

			// Update clips array
			if (clips[sceneIndex]) {
				clips[sceneIndex] = { ...clips[sceneIndex], clipUrl, clipStatus: 'done', taskId: body.id };
			}

			const allDone = clips.every(c => c.clipStatus === 'done' || c.clipStatus === 'error');
			await db.update(videoProjects)
				.set({
					clips,
					status: allDone ? 'editor' : 'rendering',
					updatedAt: new Date(),
				})
				.where(eq(videoProjects.id, projectId));

			console.log(`[replicate-webhook] ✓ Clip ${sceneIndex + 1} saved: ${clipUrl}`);

		} catch (err) {
			console.error(`[replicate-webhook] Error saving clip ${sceneIndex}:`, err);
			if (clips[sceneIndex]) {
				clips[sceneIndex] = { ...clips[sceneIndex], clipStatus: 'error', taskId: body.id };
				await db.update(videoProjects)
					.set({ clips, updatedAt: new Date() })
					.where(eq(videoProjects.id, projectId));
			}
		}
	} else if (body.status === 'failed' || body.status === 'canceled') {
		if (clips[sceneIndex]) {
			clips[sceneIndex] = { ...clips[sceneIndex], clipStatus: 'error', taskId: body.id };
			await db.update(videoProjects)
				.set({ clips, updatedAt: new Date() })
				.where(eq(videoProjects.id, projectId));
		}
		console.error(`[replicate-webhook] Prediction failed: ${body.error}`);
	}

	return json({ ok: true });
};
