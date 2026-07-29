import { db } from './db/index';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { emailService } from './email';
const env = process.env;;
import { getSiteName } from './settings-store';

// Cache to prevent spamming notifications (providerName -> timestamp)
const notificationCache = new Map<string, number>();
const NOTIFICATION_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown per provider

export async function notifyProviderBalanceEmpty(providerName: string, errorDetails: string) {
    try {
        const now = Date.now();
        const lastNotified = notificationCache.get(providerName);
        
        // Rate limiting: Only send once per hour per provider
        if (lastNotified && (now - lastNotified) < NOTIFICATION_COOLDOWN_MS) {
            console.log(`[EmergencyNotifier] Skipped sending alert for ${providerName} (in cooldown).`);
            return;
        }

        console.error(`[EmergencyNotifier] EMERGENCY: ${providerName} appears to be out of balance!`);
        
        // Update cache
        notificationCache.set(providerName, now);

        // Get admin emails
        const adminUsers = await db.select({ email: users.email })
            .from(users)
            .where(eq(users.isAdmin, true));

        const adminEmails = new Set(adminUsers.map(u => u.email).filter(Boolean) as string[]);

        // Add explicit ADMIN_EMAIL if it exists in env
        if (env.ADMIN_EMAIL) {
            adminEmails.add(env.ADMIN_EMAIL);
        }

        if (adminEmails.size === 0) {
            console.warn('[EmergencyNotifier] No admin emails found to send the alert to.');
            return;
        }

        const siteName = await getSiteName();
        const subject = `🚨 URGENT: ${providerName} Balance Empty on ${siteName}`;
        
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff4d4f; border-radius: 8px;">
                <h2 style="color: #ff4d4f;">⚠️ Action Required: ${providerName} API Error</h2>
                <p>Hello Admin,</p>
                <p>Our system has detected that <strong>${providerName}</strong> returned a billing or quota error, indicating that the account might be out of balance.</p>
                <p>Please log in to the ${providerName} dashboard immediately to check your billing settings and add funds to prevent service interruptions for your users.</p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 20px;">
                    <p style="margin-top: 0; font-weight: bold; font-size: 14px;">Error Details:</p>
                    <pre style="margin: 0; font-size: 12px; white-space: pre-wrap; word-wrap: break-word;">${errorDetails}</pre>
                </div>
                
                <p style="font-size: 12px; color: #888; margin-top: 20px;">
                    This is an automated emergency alert from ${siteName}. You will not receive another alert for this provider for at least 1 hour.
                </p>
            </div>
        `;

        const text = `URGENT: ${providerName} API Error on ${siteName}\n\nOur system has detected that ${providerName} returned a billing/quota error. Please check your ${providerName} dashboard and add funds.\n\nError details: ${errorDetails}`;

        for (const email of adminEmails) {
            await emailService.sendEmail({
                to: email,
                subject,
                html,
                text
            });
            console.log(`[EmergencyNotifier] Alert sent to ${email} for ${providerName}.`);
        }
    } catch (err) {
        console.error('[EmergencyNotifier] Failed to send emergency notification:', err);
    }
}
