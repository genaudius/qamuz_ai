import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

// Suno sends a POST here when generation completes.
// We use polling instead of webhooks, so this endpoint just acknowledges the callback.
export const POST: RequestHandler = async () => {
	return json({ received: true });
};
