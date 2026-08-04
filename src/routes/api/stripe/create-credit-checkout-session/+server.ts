import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { StripeService } from '$lib/server/stripe.js';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return error(401, 'Authentication required');
	}

	const { packageId } = await request.json();
	if (!packageId || typeof packageId !== 'string') {
		return error(400, 'Credit package is required');
	}

	try {
		const returnUrl = `${url.origin}/settings/billing?session_id={CHECKOUT_SESSION_ID}&credit_purchase=true`;
		const checkoutSession = await StripeService.createCreditCheckoutSession(
			session.user.id,
			packageId,
			returnUrl
		);

		return json({
			clientSecret: checkoutSession.client_secret,
			sessionId: checkoutSession.id,
		});
	} catch (checkoutError) {
		console.error('Failed to create credit checkout session:', checkoutError);
		return error(500, checkoutError instanceof Error ? checkoutError.message : 'Failed to start credit checkout');
	}
};
