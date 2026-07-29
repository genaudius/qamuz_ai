import { db } from './db/index';
import { usageTracking, users, subscriptions, pricingPlans, chats } from './db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { StripeService } from './stripe';
import { getModelProvider } from '../ai/index';

export class UsageLimitError extends Error {
	constructor(message: string, public remainingQuota: number = 0) {
		super(message);
		this.name = 'UsageLimitError';
	}
}

export interface UsageLimits {
	creditLimit: number | null; // null = unlimited
}

export interface CurrentUsage {
	creditsUsed: number;
	month: number;
	year: number;
}

export interface ModelUsageStatistic {
	model: string;
	provider: string;
	count: number;
	percentage: number;
}

export class UsageTrackingService {
	/**
	 * Get tier-based limits for a user based on their subscription
	 */
	static async getUserLimits(userId: string, planTier?: string): Promise<UsageLimits> {
		try {
			// If plan tier is provided, use it; otherwise query from database
			let userPlanTier = planTier;

			if (!userPlanTier) {
				const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
				userPlanTier = user?.planTier ?? 'free';
			}

			if (userPlanTier === 'free') {
				// Free tier limits - fetch from database
				const [freePlan] = await db
					.select()
					.from(pricingPlans)
					.where(eq(pricingPlans.tier, 'free'))
					.limit(1);
				
				if (freePlan) {
					return {
						creditLimit: freePlan.creditLimit
					};
				}

				// Fallback to unlimited if free plan not found in database
				return {
					creditLimit: null
				};
			}

			// Get user's active subscription for paid plans
			const subscriptionData = await StripeService.getActiveSubscription(userId);
			
			if (!subscriptionData?.plan) {
				// Default to free tier limits if no subscription found
				const [freePlan] = await db
					.select()
					.from(pricingPlans)
					.where(eq(pricingPlans.tier, 'free'))
					.limit(1);
				
				if (freePlan) {
					return {
						creditLimit: freePlan.creditLimit
					};
				}

				// Fallback to unlimited if free plan not found
				return {
					creditLimit: null
				};
			}

			// Return plan-specific limits for paid plans
			return {
				creditLimit: subscriptionData.plan.creditLimit
			};
		} catch (error) {
			console.error('Error getting user limits:', error);
			// Default to unlimited on error to be permissive
			return {
				creditLimit: null
			};
		}
	}

	/**
	 * Check if user exists in the database
	 */
	static async userExists(userId: string): Promise<boolean> {
		try {
			const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
			return !!user;
		} catch (error) {
			console.error('Error checking user existence:', error);
			return false;
		}
	}

	/**
	 * Get the next reset time for free plan users (next 00:00 or 12:00 UTC)
	 */
	static getNextFreeResetTime(): Date {
		const now = new Date();
		const currentHour = now.getUTCHours();

		const nextReset = new Date(now);
		nextReset.setUTCMinutes(0, 0, 0); // Set to exact hour

		if (currentHour < 12) {
			// Next reset is at 12:00 UTC today
			nextReset.setUTCHours(12);
		} else {
			// Next reset is at 00:00 UTC tomorrow
			nextReset.setUTCDate(nextReset.getUTCDate() + 1);
			nextReset.setUTCHours(0);
		}

		return nextReset;
	}

	/**
	 * Get free plan period info for display
	 */
	static getFreePlanPeriod() {
		const now = new Date();
		const nextReset = this.getNextFreeResetTime();
		const hoursUntilReset = Math.floor((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60));

		// Calculate current period start (last 00:00 or 12:00 UTC)
		const currentHour = now.getUTCHours();
		const periodStart = new Date(now);
		periodStart.setUTCMinutes(0, 0, 0);

		if (currentHour >= 12) {
			// Current period started at 12:00 UTC today
			periodStart.setUTCHours(12);
		} else {
			// Current period started at 00:00 UTC today
			periodStart.setUTCHours(0);
		}

		return {
			start: periodStart.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: 'UTC'
			}) + ' at ' + periodStart.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: 'UTC'
			}) + ' UTC',
			end: nextReset.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				timeZone: 'UTC'
			}) + ' at ' + nextReset.toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				timeZone: 'UTC'
			}) + ' UTC',
			daysRemaining: 0, // Not applicable for 12-hour periods
			hoursRemaining: hoursUntilReset,
			month: now.getMonth() + 1,
			year: now.getFullYear()
		};
	}

	/**
	 * Check if free plan usage should be reset (every 12 hours at 00:00 and 12:00 UTC)
	 */
	static shouldResetFreeUsage(lastResetAt: Date): boolean {
		const now = new Date();
		const timeSinceReset = now.getTime() - lastResetAt.getTime();
		const twelveHoursInMs = 12 * 60 * 60 * 1000;

		// Simple check: if it's been more than 12 hours since last reset
		if (timeSinceReset >= twelveHoursInMs) {
			return true;
		}

		// Check if we've crossed a reset boundary (00:00 or 12:00 UTC)
		const currentHour = now.getUTCHours();
		const lastResetHour = lastResetAt.getUTCHours();
		const sameDay = now.getUTCDate() === lastResetAt.getUTCDate() && now.getUTCMonth() === lastResetAt.getUTCMonth() && now.getUTCFullYear() === lastResetAt.getUTCFullYear();

		if (sameDay) {
			// Same day: check if we crossed from AM to PM (12:00 UTC)
			return (lastResetHour < 12 && currentHour >= 12);
		} else {
			// Different day: we've definitely crossed midnight (00:00 UTC)
			return true;
		}
	}

	/**
	 * Reset free plan usage to zero
	 */
	static async resetFreeUsage(userId: string, month: number, year: number): Promise<void> {
		const now = new Date();

		try {
			await db
				.update(usageTracking)
				.set({
					creditsUsed: 0,
					lastResetAt: now,
					updatedAt: now,
				})
				.where(
					and(
						eq(usageTracking.userId, userId),
						eq(usageTracking.month, month),
						eq(usageTracking.year, year)
					)
				);

			console.log(`Reset free plan usage for user ${userId} at ${now.toISOString()}`);
		} catch (error) {
			console.error('Error resetting free plan usage:', error);
			throw error;
		}
	}

	/**
	 * Get current usage for free plan users (with 12-hour reset logic)
	 */
	static async getCurrentFreeUsage(userId: string): Promise<CurrentUsage> {
		const now = new Date();
		const currentMonth = now.getMonth() + 1; // 1-12
		const currentYear = now.getFullYear();

		try {
			const [usage] = await db
				.select()
				.from(usageTracking)
				.where(
					and(
						eq(usageTracking.userId, userId),
						eq(usageTracking.month, currentMonth),
						eq(usageTracking.year, currentYear)
					)
				);

			if (!usage) {
				// Create new usage record for this month
				const newUsage = {
					userId,
					month: currentMonth,
					year: currentYear,
					creditsUsed: 0
				};

				await db.insert(usageTracking).values(newUsage).onConflictDoNothing();

				// Fetch the record (either the one we just created or existing one from concurrent request)
				const [createdUsage] = await db
					.select()
					.from(usageTracking)
					.where(
						and(
							eq(usageTracking.userId, userId),
							eq(usageTracking.month, currentMonth),
							eq(usageTracking.year, currentYear)
						)
					);

				return {
					creditsUsed: createdUsage?.creditsUsed || 0,
					month: currentMonth,
					year: currentYear
				};
			}

			// Check if usage should be reset (every 12 hours)
			if (this.shouldResetFreeUsage(usage.lastResetAt)) {
				await this.resetFreeUsage(userId, currentMonth, currentYear);

				return {
					creditsUsed: 0,
					month: currentMonth,
					year: currentYear
				};
			}

			return {
				creditsUsed: usage.creditsUsed,
				month: usage.month,
				year: usage.year
			};
		} catch (error) {
			console.error('Error getting current free usage:', error);
			return {
				creditsUsed: 0,
				month: currentMonth,
				year: currentYear
			};
		}
	}

	/**
	 * Get current month usage for a user
	 */
	static async getCurrentMonthUsage(userId: string, planTier?: string): Promise<CurrentUsage> {
		// If plan tier is provided, use it; otherwise query from database
		let userPlanTier = planTier;

		if (!userPlanTier) {
			try {
				const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
				userPlanTier = user?.planTier ?? 'free';
			} catch (error) {
				console.error('Error checking user plan tier:', error);
				// Continue with regular monthly logic as fallback
				userPlanTier = 'free';
			}
		}

		// Check if user is on free plan - if so, use 12-hour reset logic
		if (userPlanTier === 'free') {
			return await this.getCurrentFreeUsage(userId);
		}

		const now = new Date();
		const currentMonth = now.getMonth() + 1; // 1-12
		const currentYear = now.getFullYear();

		try {
			const [usage] = await db
				.select()
				.from(usageTracking)
				.where(
					and(
						eq(usageTracking.userId, userId),
						eq(usageTracking.month, currentMonth),
						eq(usageTracking.year, currentYear)
					)
				);

			if (!usage) {
				// Create new usage record for this month using ON CONFLICT to handle race conditions
				const newUsage = {
					userId,
					month: currentMonth,
					year: currentYear,
					creditsUsed: 0
				};

				await db.insert(usageTracking).values(newUsage).onConflictDoNothing();

				// Fetch the record (either the one we just created or existing one from concurrent request)
				const [createdUsage] = await db
					.select()
					.from(usageTracking)
					.where(
						and(
							eq(usageTracking.userId, userId),
							eq(usageTracking.month, currentMonth),
							eq(usageTracking.year, currentYear)
						)
					);

				return {
					creditsUsed: createdUsage?.creditsUsed || 0,
					month: currentMonth,
					year: currentYear
				};
			}

			return {
				creditsUsed: usage.creditsUsed,
				month: usage.month,
				year: usage.year
			};
		} catch (error) {
			console.error('Error getting current usage:', error);
			return {
				creditsUsed: 0,
				month: currentMonth,
				year: currentYear
			};
		}
	}

	/**
	 * Check if user can make a request based on their limits and current usage
	 * Includes grace period logic for recently expired subscriptions
	 */
	static async checkUsageLimit(userId: string, cost: number): Promise<void> {
		// Get user info and check existence in single query
		const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

		if (!user) {
			console.warn(`User ${userId} not found in database - allowing request without tracking`);
			return; // Allow the request but skip usage tracking
		}

		const planTier = user.planTier ?? 'free';

		const [limits, currentUsage] = await Promise.all([
			this.getUserLimits(userId, planTier),
			this.getCurrentMonthUsage(userId, planTier)
		]);
		
		const limit = limits.creditLimit;
		const used = currentUsage.creditsUsed;

		// null or -1 means unlimited
		if (limit === null || limit === -1) {
			return; // Unlimited usage
		}

		const totalLimit = limit + (user.creditBalance || 0);

		// Fire low balance notification exactly once when crossing the 75% threshold
		if (totalLimit !== null && totalLimit !== -1) {
			const threshold = totalLimit * 0.75;
			if (used < threshold && (used + cost) >= threshold) {
				if (user.autoTopupEnabled && user.autoTopupAmount && user.autoTopupCredits) {
					// Trigger auto top-up
					try {
						const { StripeService } = await import('./stripe');
						const { sql } = await import('drizzle-orm');
						const success = await StripeService.chargeAutoTopup(userId, user.autoTopupAmount * 100, user.autoTopupCredits);
						const { createNotification } = await import('./notifications');
						if (success) {
							await db.execute(sql`UPDATE "user" SET "creditBalance" = COALESCE("creditBalance", 0) + ${user.autoTopupCredits} WHERE id = ${userId}`);
							await createNotification(userId, 'Auto Top-up Successful', `Added ${user.autoTopupCredits} credits.`, 'billing', '/settings');
						} else {
							await db.update(users).set({ autoTopupEnabled: false }).where(eq(users.id, userId));
							await createNotification(userId, 'Auto Top-up Failed', `Payment declined. Auto top-up disabled.`, 'billing', '/settings');
						}
					} catch (err) {
						console.error('Failed to execute auto top-up', err);
					}
				} else {
					try {
						const { createNotification } = await import('./notifications');
						await createNotification(
							userId,
							'Low Balance Warning',
							`You have used 75% of your available credits.`,
							'billing',
							'/settings'
						);
					} catch (err) {
						console.error('Failed to trigger low balance notification', err);
					}
				}
			}
		}

		if (used + cost > totalLimit) {
			// Check for grace period if user has exceeded limits
			const hasGracePeriod = await this.checkGracePeriod(userId);
			
			if (!hasGracePeriod) {
				const remaining = Math.max(0, limit - used);
				throw new UsageLimitError(
					`Insufficient credits. This action costs ${cost} credits, but you only have ${remaining} credits remaining this month.`,
					remaining
				);
			}
			
			// Allow usage during grace period but log it
			console.log(`Grace period usage for user ${userId} (cost: ${cost})`);
		}
	}

	/**
	 * Track usage after successful generation
	 */
	static async trackUsage(userId: string, cost: number): Promise<void> {
		// Check if user exists in database - if not, skip tracking
		const userExistsInDb = await this.userExists(userId);
		if (!userExistsInDb) {
			console.warn(`User ${userId} not found in database - skipping usage tracking`);
			return;
		}

		const now = new Date();
		const currentMonth = now.getMonth() + 1;
		const currentYear = now.getFullYear();

		try {
			// Use upsert to handle race conditions
			await db.insert(usageTracking).values({
				userId,
				month: currentMonth,
				year: currentYear,
				creditsUsed: cost,
				lastResetAt: now,
			}).onConflictDoUpdate({
				target: [usageTracking.userId, usageTracking.month, usageTracking.year],
				set: {
					creditsUsed: sql`${usageTracking.creditsUsed} + ${cost}`,
					updatedAt: now,
				}
			});

			console.log(`Tracked usage for user ${userId} (cost: ${cost})`);
		} catch (error) {
			console.error('Error tracking usage:', error);
			// Don't throw - usage tracking failure shouldn't block the request
		}
	}

	/**
	 * Check and track usage in one call (for middleware)
	 */
	static async checkAndTrackUsage(userId: string, cost: number): Promise<void> {
		// First check if user can make the request
		await this.checkUsageLimit(userId, cost);

		// If successful, track the usage
		await this.trackUsage(userId, cost);
	}

	static async checkUsageWarnings(userId: string): Promise<boolean> {
		// Get plan tier once to avoid duplicate queries
		const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		const planTier = user?.planTier ?? 'free';

		const [limits, currentUsage] = await Promise.all([
			this.getUserLimits(userId, planTier),
			this.getCurrentMonthUsage(userId, planTier)
		]);

		const totalLimit = limits.creditLimit !== null && limits.creditLimit !== -1 
			? limits.creditLimit + (user?.creditBalance || 0)
			: null;

		return totalLimit !== null
			? (currentUsage.creditsUsed / totalLimit) > 0.75
			: false;
	}

	/**
	 * Get usage summary for dashboard display
	 */
	static async getUsageSummary(userId: string, planTier?: string) {
		// Single query to get user info if plan tier not provided
		let userPlanTier = planTier;
		let dbUser = null;
		
		try {
			const results = await db.select().from(users).where(eq(users.id, userId)).limit(1);
			dbUser = results[0];
			if (!userPlanTier) {
				userPlanTier = dbUser?.planTier ?? 'free';
			}
		} catch (error) {
			console.error('Error getting user plan tier:', error);
			userPlanTier = 'free'; // Safe fallback
		}

		const [limits, currentUsage] = await Promise.all([
			this.getUserLimits(userId, userPlanTier),
			this.getCurrentMonthUsage(userId, userPlanTier)
		]);

		const totalLimit = limits.creditLimit !== null && limits.creditLimit !== -1 
			? limits.creditLimit + (dbUser?.creditBalance || 0)
			: null;

		return {
			credits: {
				used: currentUsage.creditsUsed,
				limit: totalLimit,
				percentage: totalLimit
					? Math.min(100, (currentUsage.creditsUsed / totalLimit) * 100)
					: 0
			},
			month: currentUsage.month,
			year: currentUsage.year
		};
	}

	/**
	 * Get model usage statistics for a user in the current billing period
	 */
	static async getModelUsageStatistics(userId: string): Promise<ModelUsageStatistic[]> {
		try {
			// Get the current billing period for the user
			const currentUsage = await this.getCurrentMonthUsage(userId);
			const { month, year } = currentUsage;

			// Get all chats for this user in the current billing period
			const userChats = await db
				.select({
					model: chats.model,
					messages: chats.messages,
				})
				.from(chats)
				.where(
					and(
						eq(chats.userId, userId),
						sql`EXTRACT(MONTH FROM ${chats.createdAt}) = ${month}`,
						sql`EXTRACT(YEAR FROM ${chats.createdAt}) = ${year}`
					)
				);

			if (userChats.length === 0) {
				return [];
			}

			// Count model usage from user messages (each user message = 1 model interaction)
			const modelCounts = new Map<string, number>();

			for (const chat of userChats) {
				const messages = chat.messages || [];
				for (const message of messages) {
					if (message.role === 'user') {
						// Use message model (for mid-chat switches) or fallback to chat model
						const modelUsed = message.model || chat.model;
						if (modelUsed) {
							modelCounts.set(modelUsed, (modelCounts.get(modelUsed) || 0) + 1);
						}
					}
				}
			}

			// Calculate total usage and percentages
			const totalUsage = Array.from(modelCounts.values()).reduce((sum, count) => sum + count, 0);
			
			// Convert to ModelUsageStatistic array and sort by usage
			const modelStats: ModelUsageStatistic[] = Array.from(modelCounts.entries())
				.map(([model, count]) => {
					const provider = getModelProvider(model);
					return {
						model,
						provider: provider?.name || 'Unknown',
						count,
						percentage: totalUsage > 0 ? Math.round((count / totalUsage) * 100) : 0,
					};
				})
				.sort((a, b) => b.count - a.count) // Sort by usage count descending
				.slice(0, 5); // Limit to top 5 models

			return modelStats;
		} catch (error) {
			console.error('Error getting model usage statistics:', error);
			return [];
		}
	}

	/**
	 * Check if user is in grace period (recently expired subscription)
	 */
	static async checkGracePeriod(userId: string): Promise<boolean> {
		try {
			// First check if user has free plan - no grace period for free users
			const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
			
			if (user?.planTier === 'free') {
				return false; // Free users don't get grace periods
			}

			const subscriptionData = await StripeService.getActiveSubscription(userId);
			
			// If user has active subscription, no grace period needed
			if (subscriptionData?.subscription?.status === 'active') {
				return false;
			}
			
			// Check if subscription recently expired (within last 3 days)
			if (subscriptionData?.subscription) {
				const subscription = subscriptionData.subscription;
				const currentPeriodEnd = new Date(subscription.currentPeriodEnd);
				const now = new Date();
				const daysSinceExpiry = (now.getTime() - currentPeriodEnd.getTime()) / (1000 * 60 * 60 * 24);
				
				// Grace period: 3 days after subscription expiry
				if (daysSinceExpiry <= 3 && daysSinceExpiry >= 0) {
					return true;
				}
			}
			
			return false;
		} catch (error) {
			console.error('Error checking grace period:', error);
			return false;
		}
	}

	/**
	 * Reset usage for a specific month (admin function)
	 */
	static async resetMonthlyUsage(userId: string, month?: number, year?: number): Promise<void> {
		const now = new Date();
		const targetMonth = month || (now.getMonth() + 1);
		const targetYear = year || now.getFullYear();

		try {
			await db
				.update(usageTracking)
				.set({
					creditsUsed: 0,
					lastResetAt: now,
					updatedAt: now,
				})
				.where(
					and(
						eq(usageTracking.userId, userId),
						eq(usageTracking.month, targetMonth),
						eq(usageTracking.year, targetYear)
					)
				);

			console.log(`Reset usage for user ${userId} for ${targetMonth}/${targetYear}`);
		} catch (error) {
			console.error('Error resetting usage:', error);
			throw error;
		}
	}

	/**
	 * Calculate cost in credits for a given usage type and model
	 */
	static calculateCost(usageType: 'text' | 'image' | 'video' | 'music' | 'sfx' | 'voice_change' | 'ai_vocals' | 'tts' | 'transcription', model?: string, length?: number): number {
		switch (usageType) {
			case 'music': return 50; // 50 credits per song
			case 'sfx': return 25; // 25 credits per sound effect
			case 'voice_change': return 100; // 100 credits per voice change
			case 'ai_vocals': return 50; // 50 credits per AI vocals
			case 'tts': return length ? Math.max(1, Math.ceil((length / 100) * 33)) : 33; // 33 credits per 100 characters
			case 'transcription': return 5;
			case 'image': return 5;
			case 'video': return 10;
			case 'text':
				// Premium models cost more
				if (model?.toLowerCase().includes('gpt-4') || model?.toLowerCase().includes('claude-3-5')) {
					return 5;
				}
				return 1;
			default:
				return 1;
		}
	}
}
