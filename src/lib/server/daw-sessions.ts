import { db } from '$lib/server/db/index.js';
import { dawSessions } from '$lib/server/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export type DawSessionBody = {
	name?: string;
	idea?: string;
	stage?: string;
	title?: string;
	audioUrl?: string;
	mixNotes?: string;
	snapshot?: unknown;
};

export async function listUserDawSessions(userId: string) {
	return db
		.select()
		.from(dawSessions)
		.where(eq(dawSessions.userId, userId))
		.orderBy(desc(dawSessions.updatedAt))
		.limit(80);
}

export async function upsertUserDawSession(userId: string, body: DawSessionBody) {
	const name = String(body.name ?? '').trim();
	if (!name) throw new Error('Session name required');
	const now = new Date();
	const values = {
		id: randomUUID(),
		userId,
		name,
		idea: body.idea ?? null,
		stage: body.stage ?? null,
		title: body.title ?? null,
		audioUrl: body.audioUrl ?? null,
		mixNotes: body.mixNotes ?? null,
		snapshot: body.snapshot ?? null,
		createdAt: now,
		updatedAt: now
	};
	await db
		.insert(dawSessions)
		.values(values)
		.onConflictDoUpdate({
			target: [dawSessions.userId, dawSessions.name],
			set: {
				idea: values.idea,
				stage: values.stage,
				title: values.title,
				audioUrl: values.audioUrl,
				mixNotes: values.mixNotes,
				snapshot: values.snapshot,
				updatedAt: now
			}
		});
	const [row] = await db
		.select()
		.from(dawSessions)
		.where(eq(dawSessions.userId, userId))
		.orderBy(desc(dawSessions.updatedAt))
		.limit(1);
	return row ?? values;
}
