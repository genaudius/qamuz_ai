import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

let tableReady = false;

export async function ensureMasterJobTable(): Promise<void> {
	if (tableReady) return;
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS "master_job" (
			"id" text PRIMARY KEY NOT NULL,
			"userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
			"title" text NOT NULL,
			"sourceName" text,
			"sourceKind" text NOT NULL DEFAULT 'upload',
			"sourceMusicId" text,
			"style" text,
			"recipe" json,
			"peakDb" real,
			"lufs" real,
			"durationSec" real,
			"mimeType" text NOT NULL DEFAULT 'audio/wav',
			"fileSize" integer NOT NULL DEFAULT 0,
			"storageLocation" text NOT NULL DEFAULT 'local',
			"cloudPath" text,
			"createdAt" timestamp DEFAULT now() NOT NULL
		)
	`);
	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS "master_job_user_created_idx"
		ON "master_job" ("userId", "createdAt")
	`);
	tableReady = true;
}

export function isPremiumTier(tier?: string | null): boolean {
	return tier === 'pro' || tier === 'advanced' || tier === 'premium';
}

export async function sessionUser(locals: App.Locals) {
	const session = await locals.auth();
	if (!session?.user?.id) return null;
	const [row] = await db
		.select({ id: users.id, planTier: users.planTier })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1);
	return {
		id: session.user.id,
		planTier: row?.planTier ?? session.user.planTier ?? 'free'
	};
}
