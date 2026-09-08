import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	runMusicTool,
	type MusicToolAction
} from '$lib/server/music/music-tools.js';
import { GENAUDIUS_MUSIC_CAPABILITIES } from '$lib/music/genaudius-capabilities.js';
import { genAudiusClient } from '$lib/ai/providers/genaudius-client.js';

const ACTIONS = new Set<MusicToolAction>([
	'extend',
	'cover',
	'add-vocals',
	'add-instrumental',
	'mashup',
	'replace-section',
	'stems',
	'midi',
	'wav',
	'generate-lyrics',
	'boost-style',
	'align-lyrics',
	'catalog',
	'voices',
	'mixing-tools',
	'prompt-preview',
	'status'
]);

/** List GenAudius capabilities + local runtime health. */
export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });
	const runtime = await genAudiusClient.isReady().catch(() => ({
		ready: false,
		baseUrl: 'unknown',
		reason: 'unreachable'
	}));
	return json({
		runtime,
		capabilities: GENAUDIUS_MUSIC_CAPABILITIES
	});
};

/**
 * Unified GenAudius music tools.
 * Body: { action, musicId?, ...toolParams }
 */
export const POST: RequestHandler = async ({ request, locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

	try {
		const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
		const action = String(body.action || '') as MusicToolAction;
		if (!ACTIONS.has(action)) {
			return json(
				{ error: `Unknown action. Use one of: ${[...ACTIONS].join(', ')}` },
				{ status: 400 }
			);
		}

		const origin =
			request.headers.get('origin') ||
			`${url.protocol}//${url.host}` ||
			url.origin;

		const result = await runMusicTool({
			action,
			userId: session.user.id,
			origin,
			body
		});
		const status = result.status === 'processing' ? 202 : 200;
		return json(result, { status });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Music tool failed';
		const status = message.includes('generate-only') || message.includes('disabled')
			? 403
			: message.includes('required') || message.includes('Unknown')
				? 400
				: message.includes('Suno/Kie') || message.includes('requires') || message.includes('roadmap')
					? 409
					: 502;
		return json({ error: message }, { status });
	}
};
