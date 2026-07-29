import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { creditPackages } from '$lib/server/db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';

export async function GET() {
    try {
        const packages = await db.select()
            .from(creditPackages)
            .where(eq(creditPackages.isActive, true))
            .orderBy(asc(creditPackages.priceAmount));

        return json({ packages });
    } catch (error) {
        console.error('Error fetching credit packages:', error);
        return json({ error: 'Failed to fetch credit packages', packages: [] }, { status: 500 });
    }
}
