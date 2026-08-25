import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { dawSessions } from '$lib/server/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

let tableReady = false;

export async function ensureDawSessionTable(): Promise<void> {
	if (tableReady) return;
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "daw_session" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"name" text NOT NULL,
			"idea" text,
			"stage" text,
			"title" text,
			"audioUrl" text,
			"mixNotes" text,
			"snapshot" json,
			"createdAt" timestamp DEFAULT now() NOT NULL,
			"updatedAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS "daw_session_user_name_unique"
		ON "daw_session" ("userId", "name")
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "daw_session_user_updated_idx"
		ON "daw_session" ("userId", "updatedAt")
	`);
	tableReady = true;
}

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
	await ensureDawSessionTable();
	return db
		.select()
		.from(dawSessions)
		.where(eq(dawSessions.userId, userId))
		.orderBy(desc(dawSessions.updatedAt))
		.limit(80);
}

export async function upsertUserDawSession(userId: string, body: DawSessionBody) {
	await ensureDawSessionTable();
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
