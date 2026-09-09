import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { betterAuthAccounts, users } from '../src/lib/server/db/schema.js';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);
import { eq } from 'drizzle-orm';

async function checkAccount() {
  const email = 'genaudius@gmail.com';
  
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User ID:', user.id);
  const accounts = await db.select().from(betterAuthAccounts).where(eq(betterAuthAccounts.userId, user.id));
  console.log('Accounts:', accounts.map(a => ({ id: a.id, providerId: a.providerId, accountId: a.accountId })));
}

checkAccount().catch(console.error).then(() => process.exit(0));
