import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { sessionUser, isPremiumTier } from '$lib/server/master-jobs.js';
import { CreditCostCalculator, type MaestroStudioAction } from '$lib/server/ai/cost-calculator.js';
import { UsageLimitError, UsageTrackingService } from '$lib/server/usage-tracking.js';

const LOW = 10;

function isAction(value: unknown): value is MaestroStudioAction {
	return value === 'mix' || value === 'stems' || value === 'plan' || value === 'render' || value === 'edit';
}

async function walletFor(userId: string, planTier?: string | null) {
	const [row] = await db
		.select({ creditsBalance: users.creditsBalance, planTier: users.planTier })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	const unlimited = isPremiumTier(planTier ?? row?.planTier);
	const creditsBalance = row?.creditsBalance ?? 0;
	return {
		creditsBalance,
		unlimited,
		low: !unlimited && creditsBalance <= LOW
	};
}

export const GET: RequestHandler = async ({ locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });
	const wallet = await walletFor(user.id, user.planTier);
	return json(wallet);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await sessionUser(locals);
	if (!user) return json({ error: 'Authentication required' }, { status: 401 });

	let body: Record<string, unknown> = {};
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		body = {};
	}
	if (!isAction(body.action)) {
		return json({ ok: false, error: 'action', message: 'Acción de Maestro no válida.' }, { status: 400 });
	}

	const priced = CreditCostCalculator.getMaestroStudioCost(body.action);
	const before = await walletFor(user.id, user.planTier);

	if (before.unlimited) {
		return json({
			ok: true,
			cost: 0,
			creditsBalance: before.creditsBalance,
			unlimited: true,
			low: false,
			message: 'Plan ilimitado: esta acción no descuenta créditos.'
		});
	}

	try {
		const referenceId = await UsageTrackingService.holdTransaction(
			user.id,
			priced.credits,
			priced.resourceType,
			'qamuz',
			`maestro:${body.action}`
		);
		await UsageTrackingService.commitTransaction(referenceId);
		const after = await walletFor(user.id, user.planTier);
		return json({
			ok: true,
			cost: priced.credits,
			creditsBalance: after.creditsBalance,
			unlimited: false,
			low: after.low,
			message: `Consumí ${priced.credits} crédito${priced.credits === 1 ? '' : 's'}. Saldo: ${after.creditsBalance}.`
		});
	} catch (error) {
		const after = await walletFor(user.id, user.planTier);
		const message =
			error instanceof UsageLimitError
				? `No hay saldo suficiente. Esta acción cuesta ${priced.credits} crédito${priced.credits === 1 ? '' : 's'} y tienes ${after.creditsBalance}.`
				: (error as Error).message;
		return json(
			{
				ok: false,
				error: 'insufficient',
				cost: priced.credits,
				creditsBalance: after.creditsBalance,
				unlimited: false,
				low: after.low,
				message
			},
			{ status: 402 }
		);
	}
};
