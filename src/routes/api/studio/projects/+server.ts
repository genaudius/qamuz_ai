import { json, type RequestHandler } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from '$lib/server/db/index.js';
import { dawSessionRevisions, dawSessions } from '$lib/server/db/schema.js';

async function requireUser(locals: App.Locals) {
	const session = await locals.auth();
	return session?.user?.id || null;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const userId = await requireUser(locals);
	if (!userId) return json({ error: 'Authentication required' }, { status: 401 });
	const projectId = url.searchParams.get('projectId');
	if (!projectId || url.searchParams.get('list') === '1') {
		const rows = await db.select({
			id: dawSessions.id,
			name: dawSessions.name,
			updatedAt: dawSessions.updatedAt,
			revision: sql<number>`coalesce((select max(r.revision) from daw_session_revision r where r."sessionId" = ${dawSessions.id}), 0)`,
		}).from(dawSessions).where(eq(dawSessions.userId, userId)).orderBy(desc(dawSessions.updatedAt));
		return json({ projects: rows });
	}
	const [row] = await db.select().from(dawSessions).where(and(eq(dawSessions.id, projectId), eq(dawSessions.userId, userId))).limit(1);
	if (!row) return json({ error: 'Project not found' }, { status: 404 });
	return json({ state: row.snapshot, project: { id: row.id, name: row.name } });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = await requireUser(locals);
	if (!userId) return json({ error: 'Authentication required' }, { status: 401 });
	const body = await request.json() as { name?: string };
	const requestedName = String(body.name || '').trim().slice(0, 100);
	if (!requestedName) return json({ error: 'Project name is required' }, { status: 400 });
	const existing = await db.select({ name: dawSessions.name }).from(dawSessions).where(eq(dawSessions.userId, userId));
	const names = new Set(existing.map((row) => row.name.toLocaleLowerCase()));
	let name = requestedName;
	for (let suffix = 2; names.has(name.toLocaleLowerCase()); suffix += 1) name = `${requestedName} (${suffix})`.slice(0, 100);
	const id = randomUUID();
	const snapshot = { project: name, tempo: 120, tracks: [], trackDsp: {}, pluginParams: {}, preset: 'Studio Clean', songProfile: null };
	const [project] = await db.insert(dawSessions).values({ id, userId, name, title: name, stage: 'created', snapshot }).returning();
	await db.insert(dawSessionRevisions).values({ sessionId: id, userId, revision: 1, action: 'project.created', snapshot });
	return json({ project: { ...project, revision: 1 } }, { status: 201 });
};

export const PUT: RequestHandler = async ({ url, request, locals }) => {
	const userId = await requireUser(locals);
	if (!userId) return json({ error: 'Authentication required' }, { status: 401 });
	const projectId = url.searchParams.get('projectId');
	if (!projectId) return json({ error: 'Project ID is required' }, { status: 400 });
	const body = await request.json() as { action?: string; state?: Record<string, unknown> };
	if (!body.state) return json({ error: 'Project state is required' }, { status: 400 });
	const [owned] = await db.select({ id: dawSessions.id }).from(dawSessions).where(and(eq(dawSessions.id, projectId), eq(dawSessions.userId, userId))).limit(1);
	if (!owned) return json({ error: 'Project not found' }, { status: 404 });
	const [{ revision }] = await db.select({ revision: sql<number>`coalesce(max(${dawSessionRevisions.revision}), 0) + 1` }).from(dawSessionRevisions).where(eq(dawSessionRevisions.sessionId, projectId));
	const name = String(body.state.project || 'Proyecto QAMUZ').slice(0, 100);
	await db.update(dawSessions).set({ name, title: name, snapshot: body.state, updatedAt: new Date() }).where(and(eq(dawSessions.id, projectId), eq(dawSessions.userId, userId)));
	await db.insert(dawSessionRevisions).values({ sessionId: projectId, userId, revision: Number(revision), action: String(body.action || 'autosave').slice(0, 80), snapshot: body.state });
	return json({ ok: true, revision: Number(revision) });
};
