import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

// GET /api/billing/portal — redirects to Stripe customer portal
export const GET: RequestHandler = async ({ locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) return json({ error: 'Auth required' }, { status: 401 });

	const stripeKey = env.STRIPE_SECRET_KEY;
	if (!stripeKey) return json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to your environment.' }, { status: 503 });

	const [user] = await db.select({ stripeCustomerId: users.stripeCustomerId, planTier: users.planTier })
		.from(users).where(eq(users.id, session.user.id));

	if (!user?.stripeCustomerId) {
		// No stripe customer yet — redirect to pricing page
		redirect(302, '/pricing');
	}

	const returnUrl = `${url.origin}/workspace`;

	// Create Stripe billing portal session
	const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${stripeKey}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			customer: user.stripeCustomerId,
			return_url: returnUrl,
		}),
	});

	if (!res.ok) {
		const err = await res.json() as { error?: { message?: string } };
		return json({ error: err.error?.message ?? 'Stripe portal error' }, { status: 500 });
	}

	const portal = await res.json() as { url: string };
	redirect(302, portal.url);
};
