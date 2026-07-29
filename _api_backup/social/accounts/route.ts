import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { socialAccounts } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

// GET /api/social/accounts — list connected social accounts for current user
export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const accounts = await db.select({
		id: socialAccounts.id,
		platform: socialAccounts.platform,
		platformUsername: socialAccounts.platformUsername,
		platformAvatar: socialAccounts.platformAvatar,
		createdAt: socialAccounts.createdAt,
	}).from(socialAccounts).where(eq(socialAccounts.userId, session.user.id));

	return json({ accounts });
};

// DELETE /api/social/accounts?platform=youtube — disconnect a platform
export const DELETE: RequestHandler = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const platform = url.searchParams.get('platform');
	if (!platform) return json({ error: 'platform required' }, { status: 400 });

	await db.delete(socialAccounts)
		.where(eq(socialAccounts.userId, session.user.id));

	return json({ ok: true });
};
