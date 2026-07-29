import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { videoProjects } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import type { VideoClip, VideoScene } from '$lib/server/db/schema.js';
import { openRouterProvider } from '$lib/ai/providers/openrouter.js';
import { env } from '$env/dynamic/private';

// Recognised intents the agent can handle
type AgentIntent =
	| 'apply_effect'
	| 'suggest_effects'
	| 'edit_scene'
	| 'create_scene'
	| 'remix_audio'
	| 'general_advice'
	| 'confirm_suggestion';

interface AgentResponse {
	reply: string;
	intent: AgentIntent;
	suggestions?: Array<{ id: string; label: string; description: string }>;
	sceneUpdates?: Array<{ sceneIndex: number; prompt?: string; cameraMovement?: string; description?: string; effect?: string }>;
	audioAction?: 'remix' | 'recreate';
	audioPrompt?: string;
	requiresConfirm?: boolean;
}

const SYSTEM_PROMPT = `You are an expert AI video editor embedded in the GenAudius workspace.
You help users edit, enhance, and produce music videos. You understand:
- Visual effects (color grading, transitions, blur, glow, vintage, cinematic LUTs)
- Camera movements (dolly, pan, tilt, zoom, crane, handheld)
- Scene composition and storyboarding
- Audio mixing and sync
- Platform-specific optimizations (TikTok 9:16, YouTube 16:9, etc.)
- Suno API for audio remixing

Respond in the user's language (Spanish if they write in Spanish).

Always return a valid JSON object with this structure:
{
  "reply": "Your response to the user (conversational, helpful)",
  "intent": "apply_effect | suggest_effects | edit_scene | create_scene | remix_audio | general_advice | confirm_suggestion",
  "suggestions": [{ "id": "string", "label": "string", "description": "string" }],  // only if suggesting
  "sceneUpdates": [{ "sceneIndex": 0, "prompt": "new prompt", "cameraMovement": "string", "effect": "effect_name" }],  // if editing
  "audioAction": "remix | recreate",  // only for audio intents
  "audioPrompt": "Suno prompt for audio remixing",  // only for audio intents
  "requiresConfirm": false  // true if user must confirm before applying
}

Keep "reply" friendly and concise (1-3 sentences). Only include fields that are relevant.`;

// POST /api/video-projects/[id]/workspace-agent
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const [project] = await db.select().from(videoProjects)
		.where(and(eq(videoProjects.id, params.id), eq(videoProjects.userId, session.user.id)));
	if (!project) return json({ error: 'Project not found' }, { status: 404 });

	const body = await request.json() as {
		message: string;
		history: Array<{ role: 'user' | 'assistant'; content: string }>;
		pendingSuggestion?: AgentResponse['suggestions'];
		confirmed?: boolean;
	};

	const clips = (project.clips as VideoClip[]) ?? [];
	const sceneSummary = clips.map((c, i) =>
		`Scene ${i+1}: ${c.type ?? 'unknown'} | ${fmtSec(c.startSec)}-${fmtSec(c.endSec)} | "${c.description?.slice(0,60)}"`
	).join('\n');

	const contextBlock = `
PROJECT CONTEXT:
- Title: from track
- Scenes: ${clips.length}
- Platform config: ${JSON.stringify(project.config ?? {})}
- Scene list:
${sceneSummary}
`;

	const messages = [
		...body.history.slice(-8).map(m => ({ role: m.role, content: m.content })),
		{ role: 'user' as const, content: body.confirmed
			? `[USER CONFIRMED] Apply the previously suggested changes: ${JSON.stringify(body.pendingSuggestion)}`
			: body.message },
	];

	try {
		const raw = await openRouterProvider.chat({
			model: 'google/gemini-2.5-flash',
			messages: [
				{ role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextBlock },
				...messages,
			],
			maxTokens: 800,
			temperature: 0.7,
		});

		const text = typeof raw === 'string' ? raw
			: (raw as { text?: string; content?: string }).text
			?? (raw as { text?: string; content?: string }).content ?? '{}';

		const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
		let agentResp: AgentResponse;
		try {
			agentResp = JSON.parse(cleaned);
		} catch {
			agentResp = { reply: text, intent: 'general_advice' };
		}

		// Apply scene updates to DB if not requiring confirmation
		if (agentResp.sceneUpdates?.length && !agentResp.requiresConfirm) {
			const updatedClips = [...clips];
			for (const upd of agentResp.sceneUpdates) {
				const i = upd.sceneIndex;
				if (i >= 0 && i < updatedClips.length) {
					updatedClips[i] = {
						...updatedClips[i],
						...(upd.prompt        && { prompt: upd.prompt }),
						...(upd.cameraMovement && { cameraMovement: upd.cameraMovement }),
						...(upd.description    && { description: upd.description }),
						// Mark image as needing regen if prompt changed
						...(upd.prompt || upd.effect ? { imageStatus: 'pending' as const, imageUrl: undefined, clipStatus: 'pending' as const, clipUrl: undefined } : {}),
					};
				}
			}
			await db.update(videoProjects)
				.set({ clips: updatedClips, updatedAt: new Date() })
				.where(eq(videoProjects.id, params.id));
		}

		// Handle Suno audio remix
		if (agentResp.audioAction && agentResp.audioPrompt) {
			const sunoKey = env.SUNO_API_KEY;
			if (sunoKey) {
				// Suno remix will be triggered asynchronously
				// Return the intent so the frontend can show progress
				agentResp.reply += '\n\n🎵 Iniciando remix con Suno...';
			} else {
				agentResp.reply += '\n\n⚠ Suno API no configurada. Añade SUNO_API_KEY en Admin Settings para activar el remix de audio.';
				agentResp.audioAction = undefined;
			}
		}

		return json(agentResp);

	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		return json({ reply: `Error del agente: ${msg}`, intent: 'general_advice' }, { status: 500 });
	}
};

function fmtSec(s: number) {
	return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
}
