import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VideoClip } from '$lib/server/db/schema.js';
import { saveVideoAndGetId, saveAudioAndGetId } from '$lib/ai/utils.js';

// POST /api/video-projects/[id]/upload
// Multipart: type=video|audio, file=<blob>, sceneIndex=<number>
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));
	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const form = await request.formData();
	const uploadType = form.get('type') as 'video' | 'audio' | null;
	const file = form.get('file') as File | null;
	const sceneIndexRaw = form.get('sceneIndex');
	const sceneIndex = sceneIndexRaw !== null ? parseInt(String(sceneIndexRaw), 10) : null;

	if (!file) return json({ error: 'No file provided' }, { status: 400 });
	if (!uploadType || !['video', 'audio'].includes(uploadType)) return json({ error: 'type must be video or audio' }, { status: 400 });

	const maxBytes = 200 * 1024 * 1024; // 200 MB
	if (file.size > maxBytes) return json({ error: 'File too large (max 200MB)' }, { status: 413 });

	const buffer = await file.arrayBuffer();
	const base64  = Buffer.from(buffer).toString('base64');
	const mimeType = file.type || (uploadType === 'video' ? 'video/mp4' : 'audio/mpeg');

	try {
		if (uploadType === 'video') {
			const videoId = await saveVideoAndGetId(base64, mimeType, session.user.id, undefined, 0, '720p', 24, false);
			const clipUrl = `/api/videos/${videoId}`;

			// Update the scene clip if sceneIndex provided
			if (sceneIndex !== null && sceneIndex >= 0) {
				const clips: VideoClip[] = (project.clips ?? project.scenes?.map(s => ({ ...s, clipStatus: 'pending' as const })) ?? []) as VideoClip[];
				if (clips[sceneIndex]) {
					clips[sceneIndex] = { ...clips[sceneIndex], clipUrl, clipStatus: 'done', taskId: undefined };
					await db.update(videoProjects)
						.set({ clips, updatedAt: new Date() })
						.where(eq(videoProjects.id, params.id));
				}
			}

			return json({ ok: true, type: 'video', url: clipUrl, videoId });

		} else {
			// audio
			const audioId = await saveAudioAndGetId(base64, mimeType, session.user.id, '', 'upload', '');
			const audioUrl = `/api/audio/${audioId}`;
			return json({ ok: true, type: 'audio', url: audioUrl, audioId });
		}

	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
