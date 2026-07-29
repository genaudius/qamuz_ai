import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VideoScene, VideoSceneWithImage } from '$lib/server/db/schema.js';
import { openRouterProvider } from '$lib/ai/providers/openrouter.js';

// POST /api/video-projects/[id]/ai-scene-edit
// The in-workspace AI agent: rewrites a scene's visual prompt based on a user request
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));

	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const body = await request.json() as { sceneIndex: number; userRequest: string };
	const { sceneIndex, userRequest } = body;

	const scenes = (project.scenes as VideoSceneWithImage[]) ?? (project.script as VideoScene[]) ?? [];
	const scene = scenes[sceneIndex];
	if (!scene) return json({ error: 'Scene not found' }, { status: 400 });
	if (!userRequest?.trim()) return json({ error: 'userRequest is required' }, { status: 400 });

	const systemPrompt = `You are an expert AI video director making targeted edits to individual scenes.
You receive the current scene data and the user's edit request.
Return ONLY a JSON object with the updated fields — nothing else.`;

	const userPrompt = `Current scene:
- Type: ${scene.type ?? 'unknown'}
- Description: ${scene.description}
- Visual prompt: ${scene.prompt}
- Camera movement: ${scene.cameraMovement ?? 'none'}
- Duration: ${scene.endSec - scene.startSec}s

User request: "${userRequest}"

Rewrite the visual prompt (30-50 words) and camera movement to incorporate the user's request while keeping the scene's core concept and duration.
Return ONLY this JSON:
{
  "prompt": "improved visual prompt here",
  "cameraMovement": "updated camera movement here",
  "description": "updated director note, 10-15 words"
}`;

	try {
		const response = await openRouterProvider.chat({
			model: 'google/gemini-2.5-flash',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 400,
			temperature: 0.8,
		});

		const text = typeof response === 'string'
			? response
			: (response as { text?: string; content?: string }).text
			  ?? (response as { text?: string; content?: string }).content
			  ?? '';

		const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
		const updated = JSON.parse(cleaned) as { prompt?: string; cameraMovement?: string; description?: string };

		if (!updated.prompt) return json({ error: 'AI did not return a valid prompt' }, { status: 500 });

		// Apply updates to both script and scenes arrays
		const updatedScripts = (project.script as VideoScene[] ?? []).map((s, i) =>
			i === sceneIndex ? { ...s, ...updated } : s
		);
		const updatedScenes = scenes.map((s, i) =>
			i === sceneIndex ? { ...s, ...updated, imageStatus: 'pending' as const, imageUrl: undefined } : s
		);

		await db.update(videoProjects)
			.set({ script: updatedScripts, scenes: updatedScenes, updatedAt: new Date() })
			.where(eq(videoProjects.id, params.id));

		return json({ newPrompt: updated.prompt, newCameraMovement: updated.cameraMovement, newDescription: updated.description });

	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
