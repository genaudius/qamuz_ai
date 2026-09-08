/**
 * OpenRouter text helpers for music tools (lyrics / style boost).
 * Keeps Kie off the text path — no GPU worker needed.
 */
import { getOpenRouterApiKey } from '$lib/server/settings-store.js';
import { env } from '$env/dynamic/private';

async function chatCompletion(system: string, user: string, maxTokens = 1200): Promise<string> {
	const apiKey = (await getOpenRouterApiKey().catch(() => '')) || env.OPENROUTER_API_KEY || '';
	if (!apiKey) {
		throw new Error('OpenRouter API key not configured');
	}
	const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			model: 'openai/gpt-4o-mini',
			temperature: 0.85,
			max_tokens: maxTokens,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			]
		}),
		signal: AbortSignal.timeout(60_000)
	});
	const payload = (await response.json().catch(() => null)) as {
		choices?: Array<{ message?: { content?: string } }>;
		error?: { message?: string };
	} | null;
	if (!response.ok) {
		throw new Error(payload?.error?.message || `OpenRouter error ${response.status}`);
	}
	const text = payload?.choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error('OpenRouter returned empty text');
	return text;
}

export async function boostStyleWithOpenRouter(content: string): Promise<string> {
	return chatCompletion(
		'You refine music style tags for AI music generation. Return ONLY a compact comma-separated style string, no quotes or commentary. Keep under 220 chars. Enrich production, emotion, and genre detail.',
		content,
		180
	);
}

export async function generateLyricsWithOpenRouter(prompt: string): Promise<string> {
	return chatCompletion(
		`You write song lyrics for AI music models. Output ONLY lyrics with section tags like [Verse], [Chorus], [Bridge], [Outro]. No title line, no markdown fences, no commentary. Keep singable lines under ~80 chars.`,
		prompt,
		1600
	);
}
