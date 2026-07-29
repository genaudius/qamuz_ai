import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getSunoApiKey } from '$lib/server/settings-store.js';
import { env } from '$env/dynamic/private';

const SUNO_API_BASE = 'https://api.kie.ai/api/v1';

// Map action name to kie.ai create/status path segments
const ACTION_MAP: Record<string, { createPath: string; statusPath: string; responseKey: string }> = {
	'extend':             { createPath: 'generate/extend',    statusPath: 'generate/record-info',           responseKey: 'sunoData' },
	'upload-extend':      { createPath: 'extend',             statusPath: 'extend/record-info',             responseKey: 'sunoData' },
	'upload-cover':       { createPath: 'upload-cover',       statusPath: 'upload-cover/record-info',       responseKey: 'sunoData' },
	'add-vocals':         { createPath: 'add-vocals',         statusPath: 'add-vocals/record-info',         responseKey: 'sunoData' },
	'add-instrumental':   { createPath: 'add-instrumental',   statusPath: 'add-instrumental/record-info',   responseKey: 'sunoData' },
	'mashup':             { createPath: 'mashup',             statusPath: 'mashup/record-info',             responseKey: 'sunoData' },
	'replace-section':    { createPath: 'replace-section',    statusPath: 'replace-section/record-info',    responseKey: 'sunoData' },
	'vocal-remove':       { createPath: 'vocal-removal/generate', statusPath: 'vocal-removal/record-info',  responseKey: 'musicData' },
	'midi':               { createPath: 'midi',               statusPath: 'midi/record-info',               responseKey: 'midiData' },
	'persona':            { createPath: 'persona',            statusPath: 'persona/record-info',            responseKey: 'personaData' },
	'music-video':        { createPath: 'mp4/generate',       statusPath: 'mp4/record-info',                responseKey: 'videoData' },
	'wav':                { createPath: 'wav',                statusPath: 'wav/record-info',                responseKey: 'wavData' },
	'lyrics':             { createPath: 'lyrics/generate',    statusPath: 'lyrics/record-info',             responseKey: 'lyricsData' },
	'timestamped-lyrics': { createPath: 'timestamped-lyrics', statusPath: 'timestamped-lyrics/record-info', responseKey: 'lyricsData' },
	'style-boost':        { createPath: 'style-boost',        statusPath: 'style-boost/record-info',        responseKey: 'sunoData' },
	'sounds':             { createPath: 'sounds',             statusPath: 'sounds/record-info',             responseKey: 'sunoData' },
	'generate-voice':     { createPath: 'generate-voice',     statusPath: 'generate-voice/record-info',     responseKey: 'sunoData' },
};

async function getApiKey(): Promise<string> {
	try {
		const dbKey = await getSunoApiKey();
		if (dbKey) return dbKey;
	} catch { /* fall through */ }
	return (env as Record<string, string>)['SUNO_API_KEY'] || '';
}

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

		const apiKey = await getApiKey();
		if (!apiKey) return json({ error: 'Suno API key not configured' }, { status: 400 });

		const action = url.searchParams.get('action');
		const taskId = url.searchParams.get('taskId');

		if (!action || !ACTION_MAP[action]) {
			return json({ error: `Unknown action: ${action}` }, { status: 400 });
		}
		if (!taskId) {
			return json({ error: 'taskId is required' }, { status: 400 });
		}

		const { statusPath, responseKey } = ACTION_MAP[action];

		const res = await fetch(`${SUNO_API_BASE}/${statusPath}?taskId=${taskId}`, {
			headers: { Authorization: `Bearer ${apiKey}` }
		});

		if (!res.ok) throw new Error(`Suno status failed: ${res.status}`);

		const jsonResp = (await res.json()) as {
			data: { status: string; errorMessage?: string; response?: Record<string, unknown> }
		};
		const { data } = jsonResp;

		if (data.status === 'SUCCESS' || data.status === 'FIRST_SUCCESS') {
			return json({ status: 'SUCCESS', result: data.response?.[responseKey] });
		} else if (['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR'].includes(data.status)) {
			return json({ status: 'FAILED', errorMessage: data.errorMessage || `Suno studio failed: ${data.status}` });
		}

		return json({ status: data.status });
	} catch (error) {
		console.error('Suno studio GET error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};

// POST /api/suno-studio — Submit a studio action and wait for result
export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const session = await locals.auth();
		if (!session?.user?.id) return json({ error: 'Authentication required' }, { status: 401 });

		const apiKey = await getApiKey();
		if (!apiKey) return json({ error: 'Suno API key not configured. Go to Admin → Settings → AI Models.' }, { status: 400 });

		const body = await request.json();
		const { action, ...params } = body;
		let finalAction = action;

		if (params.audioUrl && !params.taskId && !params.audioId) {
			const match = params.audioUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
			if (match) {
				params.taskId = match[0];
				params.audioId = match[0];
			} else {
				// No UUID found. This is a custom uploaded file or raw URL.
				// For 'extend', kie.ai uses 'upload-extend'
				if (action === 'extend') {
					finalAction = 'upload-extend';
				} else if (action !== 'upload-extend' && action !== 'upload-cover') {
					// Other actions strictly require a taskId
					return json({ error: `Suno API requires a native Suno track for ${action}. Uploaded files are only supported for Extend.` }, { status: 400 });
				}
			}
		}

		if (!finalAction || !ACTION_MAP[finalAction]) {
			return json({ error: `Unknown action: ${finalAction}. Valid: ${Object.keys(ACTION_MAP).join(', ')}` }, { status: 400 });
		}

		const { createPath, statusPath, responseKey } = ACTION_MAP[finalAction];

		// Add callBackUrl if not provided (required by kie.ai even when polling)
		const origin = request.headers.get('origin') || new URL(request.url).origin;
		if (!params.callBackUrl) {
			params.callBackUrl = `${origin}/api/suno-callback`;
		}

		// Submit task
		const submitRes = await fetch(`${SUNO_API_BASE}/${createPath}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(params)
		});

		if (!submitRes.ok) {
			const err = (await submitRes.json().catch(() => ({}))) as { msg?: string };
			return json({ error: `Suno submit failed: ${err.msg || submitRes.statusText}` }, { status: 502 });
		}

		const submitJson = (await submitRes.json()) as { code: number; data?: { taskId?: string }; msg?: string };
		if (submitJson.code !== 200 || !submitJson.data?.taskId) {
			return json({ error: `Suno API error: ${submitJson.msg || 'No task ID'}` }, { status: 502 });
		}

		const taskId = submitJson.data.taskId;

		return json({ success: true, action: finalAction, taskId });
	} catch (error) {
		console.error('Suno studio error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};
