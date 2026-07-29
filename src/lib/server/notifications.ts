import { db } from './db/index';
import { users, notifications } from './db/schema';
import { eq } from 'drizzle-orm';

export type NotificationType = "system" | "promo" | "alert" | "billing" | "admin";

/**
 * Creates a notification for a specific user
 */
export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'system',
    link?: string
) {
    try {
        await db.insert(notifications).values({
            userId,
            title,
            message,
            type,
            link: link || null
        });
        console.log(`[Notifications] Created ${type} notification for user ${userId}`);
    } catch (err) {
        console.error(`[Notifications] Failed to create notification for user ${userId}:`, err);
    }
}

/**
 * Creates a notification for all users with isAdmin = true
 */
export async function createAdminNotification(
    title: string,
    message: string,
    type: NotificationType = 'admin',
    link?: string
) {
    try {
        // Fetch all admins
        const adminUsers = await db.select({ id: users.id })
            .from(users)
            .where(eq(users.isAdmin, true));

        if (adminUsers.length === 0) return;

        const values = adminUsers.map(admin => ({
            userId: admin.id,
            title,
            message,
            type,
            link: link || null
        }));

        await db.insert(notifications).values(values);
        console.log(`[Notifications] Created admin notification for ${adminUsers.length} admins`);
    } catch (err) {
        console.error(`[Notifications] Failed to create admin notification:`, err);
    }
}

/**
 * Creates a mass notification for ALL users in the database
 * This is done in batches to prevent overwhelming the database
 */
export async function createMassNotification(
    title: string,
    message: string,
    type: NotificationType = 'promo',
    link?: string
) {
    try {
        // We could fetch all IDs, but for huge tables it's better to chunk
        // Here we'll just fetch all since it's a typical SAAS size
        const allUsers = await db.select({ id: users.id }).from(users);
        
        if (allUsers.length === 0) return;

        const BATCH_SIZE = 1000;
        let inserted = 0;

        for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
            const batch = allUsers.slice(i, i + BATCH_SIZE);
            const values = batch.map(user => ({
                userId: user.id,
                title,
                message,
                type,
                link: link || null
            }));

            await db.insert(notifications).values(values);
            inserted += batch.length;
        }

        console.log(`[Notifications] Created mass notification for ${inserted} users`);
    } catch (err) {
        console.error(`[Notifications] Failed to create mass notification:`, err);
    }
}
