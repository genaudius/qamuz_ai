import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export function isPremiumTier(tier?: string | null): boolean {
	return tier === 'pro' || tier === 'advanced' || tier === 'premium';
}

/** Master Pro access: admins always allowed, otherwise premium plan tiers. */
export function canUseMasterPro(user: { planTier?: string | null; isAdmin?: boolean } | null): boolean {
	if (!user) return false;
	return Boolean(user.isAdmin) || isPremiumTier(user.planTier);
}

export async function sessionUser(locals: App.Locals) {
	const session = await locals.auth();
	if (!session?.user?.id) return null;
	const [row] = await db
		.select({ id: users.id, planTier: users.planTier, isAdmin: users.isAdmin })
		.from(users)
		.where(eq(users.id, session.user.id))
		.limit(1);
	return {
		id: session.user.id,
		planTier: row?.planTier ?? session.user.planTier ?? 'free',
		isAdmin: Boolean(row?.isAdmin)
	};
}
