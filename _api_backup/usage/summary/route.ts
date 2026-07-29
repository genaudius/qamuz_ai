import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UsageTrackingService } from '$lib/server/usage-tracking.js';

export const GET: RequestHandler = async ({ locals }) => {
	const session = await locals.auth();

	if (!session?.user?.id) {
		return error(401, 'Unauthorized');
	}

	const planTier = session.user.planTier || 'free';
	const summary = await UsageTrackingService.getUsageSummary(session.user.id, planTier);

	// Free plan resets every 12h — expose hours until next reset for the upgrade CTA
	const resetInHours =
		planTier === 'free' ? UsageTrackingService.getFreePlanPeriod().hoursRemaining : null;

	return json({ ...summary, resetInHours });
};
