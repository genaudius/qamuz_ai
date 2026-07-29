import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StripeService, getStripe } from '$lib/server/stripe.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		return error(401, 'Unauthorized');
	}

	try {
		const { amount, credits } = await request.json();

		if (!amount || !credits) {
			return error(400, 'Amount and credits are required');
		}

		// Save the auto top-up preference in the database
		await db.update(users).set({
			autoTopupEnabled: true,
			autoTopupAmount: amount,
			autoTopupCredits: credits
		}).where(eq(users.id, session.user.id));

		// Determine if we need to redirect to Stripe to collect a payment method
		const stripe = await getStripe();
		const customerId = await StripeService.getOrCreateCustomer(session.user.id);
		const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
		
		let hasPaymentMethod = !!customer.invoice_settings?.default_payment_method;
		if (!hasPaymentMethod) {
			const paymentMethods = await stripe.paymentMethods.list({ customer: customerId, type: 'card' });
			hasPaymentMethod = paymentMethods.data.length > 0;
		}

		if (hasPaymentMethod) {
			// They already have a payment method. We can just use it later.
			return json({
				success: true,
				redirect: false
			});
		} else {
			// No payment method saved. Create a setup session.
			const baseUrl = `${url.protocol}//${url.host}`;
			const checkoutSession = await StripeService.createSetupCheckoutSession(
				session.user.id,
				`${baseUrl}/settings/billing?autotopup=success`,
				`${baseUrl}/settings/billing?autotopup=canceled`
			);

			return json({
				success: true,
				redirect: true,
				url: checkoutSession.url,
			});
		}
	} catch (err) {
		console.error('Error enabling auto top-up:', err);
		return error(500, 'Failed to setup auto top-up');
	}
};
