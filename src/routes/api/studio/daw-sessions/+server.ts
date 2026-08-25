import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sessionUser } from '$lib/server/master-jobs.js';
import { listUserDawSessions, upsertUserDawSession } from '$lib/server/daw-sessions.js';

function serialize(row: Awaited<ReturnType<typeof listUserDawSessions>>[number]) {
	return {
		id: row.id,
		name: row.name,
		idea: row.idea,
		stage: row.stage,
		title: row.title,
		audioUrl: row.audioUrl,
		mixNotes: row.mixNotes,
		snapshot: row.snapshot,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export const GET: RequestHandler = async ({ locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });
	try {
		const rows = await listUserDawSessions(user.id);
		return json({ sessions: rows.map(serialize) });
	} catch (error) {
		console.error('daw-sessions list', error);
		return json({ sessions: [], error: 'History unavailable' }, { status: 200 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });
	try {
		const body = (await request.json()) as Record<string, unknown>;
		const row = await upsertUserDawSession(user.id, {
			name: typeof body.name === 'string' ? body.name : '',
			idea: typeof body.idea === 'string' ? body.idea : undefined,
			stage: typeof body.stage === 'string' ? body.stage : undefined,
			title: typeof body.title === 'string' ? body.title : undefined,
			audioUrl: typeof body.audioUrl === 'string' ? body.audioUrl : undefined,
			mixNotes: typeof body.mixNotes === 'string' ? body.mixNotes : undefined,
			snapshot: body.snapshot
		});
		return json({ session: serialize(row as Awaited<ReturnType<typeof listUserDawSessions>>[number]) });
	} catch (error) {
		console.error('daw-sessions save', error);
		return json({ error: (error as Error).message }, { status: 400 });
	}
};
