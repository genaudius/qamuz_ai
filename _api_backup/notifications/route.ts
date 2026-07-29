import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { notifications } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { getAuth } from '$lib/auth.js';

export async function GET({ request }) {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userNotifications = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, session.user.id))
            .orderBy(desc(notifications.createdAt))
            .limit(50); // Get latest 50

        return json(userNotifications);
    } catch (err: any) {
        return json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH({ request }) {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await request.json();

        if (id) {
            // Mark specific notification as read
            await db.update(notifications)
                .set({ isRead: true })
                .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
        } else {
            // Mark all as read
            await db.update(notifications)
                .set({ isRead: true })
                .where(eq(notifications.userId, session.user.id));
        }

        return json({ success: true });
    } catch (err: any) {
        return json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE({ request }) {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || !session.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (id) {
            await db.delete(notifications)
                .where(and(eq(notifications.id, id), eq(notifications.userId, session.user.id)));
        }

        return json({ success: true });
    } catch (err: any) {
        return json({ error: err.message }, { status: 500 });
    }
}
