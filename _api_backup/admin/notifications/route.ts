import { json } from '@sveltejs/kit';
import { getAuth } from '$lib/auth.js';
import { createMassNotification } from '$lib/server/notifications.js';

export async function POST({ request }) {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    // Ensure only admins can hit this endpoint
    if (!session || !session.user || !session.user.isAdmin) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { title, message, link, type } = await request.json();

        if (!title || !message) {
            return json({ error: 'Title and message are required' }, { status: 400 });
        }

        // Send to all users
        await createMassNotification(title, message, type || 'promo', link);

        return json({ success: true });
    } catch (err: any) {
        return json({ error: err.message }, { status: 500 });
    }
}
