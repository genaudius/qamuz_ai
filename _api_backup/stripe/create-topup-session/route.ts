import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { StripeService } from '$lib/server/stripe.js';
import { db, creditPackages } from '$lib/server/db/index.js';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	// Verify user is authenticated
	const session = await locals.auth();
	if (!session?.user?.id) {
		return error(401, 'Unauthorized');
	}

	try {
		const { packageId, customAmount, customCredits } = await request.json();

		if (!packageId && (!customAmount || !customCredits)) {
			return error(400, 'Package ID or custom amount is required');
		}

		// Determine base URL for success/cancel redirects
		const baseUrl = `${url.protocol}//${url.host}`;
		
		let stripePriceId: string | undefined = undefined;
		let creditsToAdd = 0;
		let priceData: any = undefined;

		if (packageId) {
			// Find the requested package from DB
			const [pkg] = await db.select()
				.from(creditPackages)
				.where(eq(creditPackages.id, packageId))
				.limit(1);

			if (!pkg) {
				return error(400, 'Invalid package selected');
			}
			stripePriceId = undefined; // Force dynamic price creation to avoid Live/Test mode mismatches
			creditsToAdd = pkg.credits; // Base + Bonus
			priceData = {
				currency: 'usd',
				product_data: {
					name: `${creditsToAdd} Credits`,
					description: pkg.badgeText ? `Credit Package (${pkg.badgeText})` : 'Credit Package',
				},
				unit_amount: Math.round(pkg.priceAmount * 100), // dollars to cents
			};
		} else {
			// Custom Amount Logic
			const amountInCents = Math.round(Number(customAmount) * 100);
			if (amountInCents <= 0) {
				return error(400, 'Invalid custom amount');
			}
			creditsToAdd = Number(customCredits);
			priceData = {
				currency: 'usd',
				product_data: {
					name: 'Custom Credit Top-up',
					description: `Purchase ${creditsToAdd} credits`,
				},
				unit_amount: amountInCents,
			};
		}

		// Create the Stripe checkout session
		const checkoutSession = await StripeService.createOneTimeCheckoutSession({
			userId: session.user.id,
			priceId: stripePriceId,
			priceData: priceData,
			returnUrl: `${baseUrl}/settings/billing?topup=success&session_id={CHECKOUT_SESSION_ID}`,
			credits: creditsToAdd,
		});

		// Return the client secret and publishable key to the frontend for embedded checkout
		const { getStripePublishableKey } = await import('$lib/server/settings-store.js');
		const publishableKey = await getStripePublishableKey();
		
		return json({
			clientSecret: checkoutSession.client_secret,
			publishableKey: publishableKey || process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY
		});
	} catch (err) {
		console.error('Error creating checkout session:', err);
		return error(500, 'Failed to create checkout session');
	}
};
