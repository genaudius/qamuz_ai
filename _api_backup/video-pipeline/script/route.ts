import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { openRouterProvider } from '$lib/ai/providers/openrouter.js';
import type { AIResponse } from '$lib/ai/types.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const body = await request.json();
	const { title, tags, durationSec = 30, platform = 'reels', hookText, numScenes } = body;

	const sceneCount = numScenes ?? Math.max(3, Math.min(10, Math.round(durationSec / 6)));
	const secPerScene = Math.round(durationSec / sceneCount);

	const platformDesc =
		platform === 'reels'
			? 'vertical short-form video (Reels/Shorts, 9:16 portrait)'
			: 'horizontal YouTube music video (16:9 landscape)';

	const hookNote = hookText
		? `\nIMPORTANT — the user wants to highlight this hook/phrase: "${hookText}". Build the most impactful scene around this moment.`
		: '';

	const systemPrompt = `You are a creative music video director and AI art director.
Create cinematic, visually stunning scene descriptions optimized for AI image-to-video generation.
Each image prompt must be 30-50 words: highly specific about subject, setting, lighting, mood, camera angle, and visual style.
Think: dramatic cinematography, strong composition, evocative atmosphere.
Output ONLY valid JSON — no markdown fences, no explanation, just the array.`;

	const userPrompt = `Create a ${sceneCount}-scene music video script for:

Title: ${title || 'Untitled'}
Style/Tags: ${tags || 'not specified'}
Total video duration: ${durationSec} seconds (~${secPerScene}s per scene)
Format: ${platformDesc}${hookNote}

Return ONLY a JSON array of ${sceneCount} scenes with this exact shape:
[
  {
    "index": 0,
    "startSec": 0,
    "endSec": ${secPerScene},
    "description": "Brief director note describing the narrative intent (10-15 words)",
    "prompt": "Detailed AI image generation prompt for this scene (30-50 words, cinematic quality)"
  }
]

Guidelines:
- Scene 1: strong establishing shot or hook
- Vary camera angles and settings across scenes
- Keep a consistent visual style and color palette throughout
- Make each prompt self-contained but part of a cohesive visual story
- endSec of last scene must equal ${durationSec}
Return ONLY the raw JSON array, nothing else.`;

	try {
		const response = await openRouterProvider.chat({
			model: 'google/gemini-2.5-flash',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 2000,
			temperature: 0.7,
		});

		const text =
			(response as AIResponse).content ??
			(response as { text?: string }).text ??
			'';

		// Strip markdown code fences if present
		const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
		const scenes = JSON.parse(cleaned);

		if (!Array.isArray(scenes)) throw new Error('AI returned invalid scene data');

		return json({ scenes });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
