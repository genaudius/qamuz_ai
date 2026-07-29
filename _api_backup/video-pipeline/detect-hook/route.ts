import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { openRouterProvider } from '$lib/ai/providers/openrouter.js';
import type { AIResponse } from '$lib/ai/types.js';

// POST /api/video-pipeline/detect-hook
// Analyzes track metadata and predicts the strongest hook/enganche phrase
export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const body = await request.json();
	const { title, tags, prompt, isInstrumental } = body;

	const systemPrompt = `You are an expert music producer and marketing specialist who identifies the "hook" —
the most catchy, emotionally powerful, and memorable phrase or musical moment in a song.
The hook is what makes people stop scrolling, replay the song, or sing along involuntarily.
Output ONLY valid JSON — no markdown, no explanation.`;

	const userPrompt = `Analyze this song and predict its strongest hook/enganche:

Title: ${title || 'Untitled'}
Style/Tags: ${tags || 'not specified'}
${prompt ? `Original concept: ${prompt}` : ''}
Instrumental: ${isInstrumental ? 'Yes (no lyrics)' : 'No'}

Return ONLY this JSON:
{
  "hook": "The predicted hook phrase or lyrical moment (1 short sentence or fragment, max 8 words)",
  "timingHint": "Brief note on when this likely appears (e.g., 'chorus', 'opening bars')",
  "predictedStartTimeSec": 45,
  "explanation": "One sentence explaining why this is the catchiest moment"
}

If instrumental, identify the musical hook (e.g., a melodic riff, rhythm pattern, or sonic peak).
Return ONLY the raw JSON object.`;

	try {
		const response = await openRouterProvider.chat({
			model: 'google/gemini-2.5-flash',
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			maxTokens: 300,
			temperature: 0.6,
		});

		const text =
			(response as AIResponse).content ??
			(response as { text?: string }).text ??
			'';

		const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
		const result = JSON.parse(cleaned);

		return json(result);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ error: msg }, { status: 500 });
	}
};
