import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { seedPricingPlans } from '$lib/server/pricing-plans-seeder.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { isDemoModeEnabled, DEMO_MODE_MESSAGES } from '$lib/constants/demo-mode.js';

export const POST: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return error(401, 'Unauthorized');
	}

	// Always enforce admin authorization
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.id, session.user.id));

	if (!user?.isAdmin) {
		return error(403, 'Forbidden - Admin access required');
	}

	// Check demo mode - block modifications
	if (isDemoModeEnabled()) {
		return json({
			error: DEMO_MODE_MESSAGES.ADMIN_SAVE_DISABLED,
			type: 'demo_mode_restriction'
		}, { status: 403 });
	}

	try {
		await seedPricingPlans();
		
		return json({
			success: true,
			message: 'Pricing plans seeded successfully',
		});
	} catch (err) {
		console.error('Error seeding pricing plans:', err);
		return error(500, 'Failed to seed pricing plans');
	}
};
