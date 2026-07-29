import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VideoScene } from '$lib/server/db/schema.js';
import { openRouterProvider } from '$lib/ai/providers/openrouter.js';
import type { AIResponse } from '$lib/ai/types.js';
import { z } from 'zod';

// Zod schema — validates every scene the AI returns
const SceneSchema = z.object({
	index: z.number().int().nonnegative(),
	startSec: z.number().nonnegative(),
	endSec: z.number().positive(),
	type: z.enum(['vocals', 'instrumental']),
	description: z.string().min(1),
	prompt: z.string().min(10),
	cameraMovement: z.string().min(1),
});
const ScenesSchema = z.array(SceneSchema).min(1);

// POST /api/video-projects/[id]/script
export const POST: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));

	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const cfg = project.config as { platform?: string; durationSec?: number; hookText?: string; hookStartTimeSec?: number } | null;
	const durationSec = cfg?.durationSec ?? 30;
	const platform = cfg?.platform ?? 'reels';
	const hookText = cfg?.hookText;
	const hookStartTimeSec = cfg?.hookStartTimeSec ?? 0;
	const numScenes = Math.max(3, Math.min(10, Math.round(durationSec / 6)));
	const secPerScene = Math.round(durationSec / numScenes);
	const platformDesc = platform === 'reels'
		? 'vertical short-form video (Reels/Shorts, 9:16 portrait)'
		: 'horizontal YouTube music video (16:9 landscape)';
	const hookNote = hookText
		? `\nIMPORTANT — center the most impactful scene around this hook: "${hookText}".`
		: '';

	// Has lyrics? Use them to detect vocals vs instrumental sections
	const lyricsContext = project.lyrics
		? `Song lyrics (use them to determine which time ranges have active singing vs instrumental breaks):\n${project.lyrics}`
		: `No lyrics provided — treat all scenes as instrumental unless the genre clearly implies vocals.`;

	const systemPrompt = `You are an expert music video director and AI art director.
Your job is to break a song into chronological scenes for AI video generation.

STRICT RULES:
1. Cover the FULL song from second ${hookStartTimeSec} to second ${hookStartTimeSec + durationSec} — no gaps, no overlaps.
2. Each scene lasts between 4 and 10 seconds. Aim for ~${secPerScene}s per scene.
3. Classify each scene:
   - "vocals": the artist is actively singing in this time range.
   - "instrumental": intro, outro, instrumental break, solo, no singing.
4. "cameraMovement": choose one that matches the rhythm (e.g. "Slow zoom in", "Pan left", "Static close-up", "Handheld shake", "Drone flyover", "Whip pan").
5. "prompt": 30–50 words. Be SPECIFIC: subject, environment, lighting, mood, visual style, color palette.
6. Output ONLY a valid JSON array — no markdown fences, no explanation.`;

	const userPrompt = `Create a ${numScenes}-scene music video script for this ${platformDesc}.

Title: ${project.title}
Style/Tags: ${project.style || 'not specified'}
${lyricsContext}
Total duration: ${durationSec} seconds${hookNote}

Return ONLY a JSON array with exactly ${numScenes} objects:
[
  {
    "index": 0,
    "startSec": ${hookStartTimeSec},
    "endSec": ${hookStartTimeSec + secPerScene},
    "type": "instrumental",
    "description": "Director note, 10-15 words",
    "prompt": "AI image generation prompt, 30-50 words, cinematic quality",
    "cameraMovement": "Slow zoom in"
  }
]

Requirements:
- Scene 1: strong establishing shot or hook
- Vary cameraMovement across scenes — no repeats on consecutive scenes
- Consistent visual style and color palette throughout
- endSec of LAST scene must equal exactly ${hookStartTimeSec + durationSec}
Return ONLY the raw JSON array.`;

	try {
		const response = await openRouterProvider.chat({
			model: 'google/gemini-2.5-flash',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 3000,
			temperature: 0.7,
		});

		const raw = typeof response === 'string'
			? response
			: (response as AIResponse).content ?? '';

		// Strip markdown fences then locate the JSON array boundaries
		const stripped = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '');
		const start = stripped.indexOf('[');
		const end = stripped.lastIndexOf(']');
		if (start === -1 || end === -1) throw new Error(`AI returned no JSON array. Raw: ${stripped.slice(0, 200)}`);
		const jsonStr = stripped.slice(start, end + 1);

		// Parse and validate with Zod
		const rawParsed: unknown = JSON.parse(jsonStr);
		const scenes: VideoScene[] = ScenesSchema.parse(rawParsed) as VideoScene[];

		// Ensure endSec of last scene exactly matches durationSec offset
		if (scenes.length > 0) {
			scenes[scenes.length - 1].endSec = hookStartTimeSec + durationSec;
		}

		await db.update(videoProjects)
			.set({ script: scenes, status: 'storyboard', updatedAt: new Date() })
			.where(eq(videoProjects.id, params.id));

		return json({ scenes });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		await db.update(videoProjects)
			.set({ status: 'error', errorMessage: `Script generation failed: ${msg}`, updatedAt: new Date() })
			.where(eq(videoProjects.id, params.id));
		return json({ error: msg }, { status: 500 });
	}
};
