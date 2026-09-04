import { json, type RequestHandler } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { dawSessionRevisions, dawSessions } from '$lib/server/db/schema.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	const session = await locals.auth();
	const userId = session?.user?.id;
	if (!userId) return json({ error: 'Authentication required' }, { status: 401 });
	const projectId = url.searchParams.get('projectId');
	if (!projectId) return json({ error: 'Project ID is required' }, { status: 400 });
	const [owned] = await db.select({ id: dawSessions.id }).from(dawSessions).where(and(eq(dawSessions.id, projectId), eq(dawSessions.userId, userId))).limit(1);
	if (!owned) return json({ error: 'Project not found' }, { status: 404 });
	const requested = Number(url.searchParams.get('revision'));
	if (Number.isInteger(requested) && requested > 0) {
		const [row] = await db.select().from(dawSessionRevisions).where(and(eq(dawSessionRevisions.sessionId, projectId), eq(dawSessionRevisions.userId, userId), eq(dawSessionRevisions.revision, requested))).limit(1);
		if (!row) return json({ error: 'Revision not found' }, { status: 404 });
		return json({ state: row.snapshot, revision: row.revision });
	}
	const rows = await db.select().from(dawSessionRevisions).where(and(eq(dawSessionRevisions.sessionId, projectId), eq(dawSessionRevisions.userId, userId))).orderBy(desc(dawSessionRevisions.revision)).limit(100);
	return json({
		history: rows.map((row) => ({ id: row.id, objectType: 'project', objectId: projectId, action: row.action, revision: row.revision, createdAt: row.createdAt.toISOString(), afterJson: JSON.stringify(row.snapshot) })),
		revisions: rows.map((row) => ({ revision: row.revision, action: row.action, createdAt: row.createdAt.toISOString() })),
	});
};
