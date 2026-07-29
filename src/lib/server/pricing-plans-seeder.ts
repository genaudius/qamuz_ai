import { db } from './db/index';
import { pricingPlans } from './db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Pricing Plans Seeder
 *
 * This seeder creates initial pricing plans with placeholder Stripe price IDs.
 * Real Stripe price IDs should be configured through the Admin Dashboard at /admin/settings/plans
 *
 * The system is fully database-driven - all pricing information is read from the database,
 * not from environment variables. Usage is measured in credits (creditLimit: null = unlimited).
 */

export interface PricingPlanSeed {
	name: string;
	tier: 'free' | 'plus' | 'pro';
	stripePriceId: string;
	priceAmount: number; // in cents
	currency: string;
	billingInterval: 'month' | 'year';
	creditLimit: number | null; // null = unlimited
	features: string[];
	isActive: boolean;
}

const pricingPlansData: PricingPlanSeed[] = [
	// Free Plan
	{
		name: 'Free',
		tier: 'free',
		stripePriceId: 'free', // Special non-Stripe price ID for free plan
		priceAmount: 0, // $0.00
		currency: 'usd',
		billingInterval: 'month',
		creditLimit: 500, // 500 credits per month
		features: [
			'500 credits per month',
			'Access to basic AI models',
			'Limited rate limits',
			'Community support',
			'Basic chat history'
		],
		isActive: true,
	},
	// Monthly Plans
	{
		name: 'Plus',
		tier: 'plus',
		stripePriceId: 'price_1TntsUCb1Op7pdCawsJ9CGi1',
		priceAmount: 1500, // $15.00
		currency: 'usd',
		billingInterval: 'month',
		creditLimit: 5000, // 5K credits per month
		features: [
			'5,000 credits per month',
			'All 32+ text generation models',
			'Image generation',
			'Email support',
			'Chat history storage'
		],
		isActive: true,
	},
	{
		name: 'Pro',
		tier: 'pro',
		stripePriceId: 'price_1TntsWCb1Op7pdCaLBdaHpWn',
		priceAmount: 4900, // $49.00
		currency: 'usd',
		billingInterval: 'month',
		creditLimit: 25000, // 25K credits per month
		features: [
			'25,000 credits per month',
			'All 65+ AI models',
			'Image & video generation',
			'Higher rate limits',
			'Priority processing',
			'Priority email support'
		],
		isActive: true,
	},
	// Yearly Plans
	{
		name: 'Plus',
		tier: 'plus',
		stripePriceId: 'price_1TntsVCb1Op7pdCalUSVWrWv',
		priceAmount: 12600, // $126.00 yearly
		currency: 'usd',
		billingInterval: 'year',
		creditLimit: 60000, // 60K credits per year
		features: [
			'60,000 credits per year',
			'All 32+ text generation models',
			'Image generation',
			'Email support',
			'Chat history storage'
		],
		isActive: true,
	},
	{
		name: 'Pro',
		tier: 'pro',
		stripePriceId: 'price_1TntsZCb1Op7pdCaT72IBjwv',
		priceAmount: 41160, // $411.60 yearly
		currency: 'usd',
		billingInterval: 'year',
		creditLimit: 300000, // 300K credits per year
		features: [
			'300,000 credits per year',
			'All 65+ AI models',
			'Image & video generation',
			'Higher rate limits',
			'Priority processing',
			'Priority email support'
		],
		isActive: true,
	},
];

export async function seedPricingPlans(): Promise<void> {
	console.log('Seeding pricing plans...');

	try {
		for (const planData of pricingPlansData) {
			// Check if plan already exists
			const existingPlan = await db
				.select()
				.from(pricingPlans)
				.where(eq(pricingPlans.stripePriceId, planData.stripePriceId))
				.limit(1);

			if (existingPlan.length > 0) {
				console.log(`Plan ${planData.name} already exists, updating...`);

				// Update existing plan
				await db
					.update(pricingPlans)
					.set({
						name: planData.name,
						tier: planData.tier,
						priceAmount: planData.priceAmount,
						currency: planData.currency,
						billingInterval: planData.billingInterval,
						creditLimit: planData.creditLimit,
						features: planData.features,
						isActive: planData.isActive,
						updatedAt: new Date(),
					})
					.where(eq(pricingPlans.stripePriceId, planData.stripePriceId));
			} else {
				console.log(`Creating new plan: ${planData.name}`);

				// Insert new plan
				await db.insert(pricingPlans).values(planData);
			}
		}

		console.log('Pricing plans seeded successfully!');
	} catch (error) {
		console.error('Error seeding pricing plans:', error);
		throw error;
	}
}

export async function getPricingPlans(billingInterval?: 'month' | 'year') {
	const conditions = [eq(pricingPlans.isActive, true)];

	if (billingInterval) {
		conditions.push(eq(pricingPlans.billingInterval, billingInterval));
	}

	return await db
		.select()
		.from(pricingPlans)
		.where(conditions.length === 1 ? conditions[0] : and(...conditions))
		.orderBy(pricingPlans.priceAmount);
}

// Helper function to get a specific plan by tier
export async function getPricingPlanByTier(tier: 'free' | 'plus' | 'pro') {
	const [plan] = await db
		.select()
		.from(pricingPlans)
		.where(eq(pricingPlans.tier, tier))
		.limit(1);

	return plan || null;
}

// Helper function to validate if a price ID exists in our pricing plans
export async function isValidPriceId(priceId: string): Promise<boolean> {
	try {
		const [plan] = await db
			.select({ id: pricingPlans.id })
			.from(pricingPlans)
			.where(and(
				eq(pricingPlans.stripePriceId, priceId),
				eq(pricingPlans.isActive, true)
			))
			.limit(1);

		return !!plan;
	} catch (error) {
		console.error('Error validating price ID:', error);
		return false;
	}
}
