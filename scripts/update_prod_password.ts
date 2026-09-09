import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { betterAuthAccounts, users } from '../src/lib/server/db/schema.js';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);
import { eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';
async function updateAdminPassword() {
  const email = 'genaudius@gmail.com';
  const newPassword = '@@##Odg4383@';
  
  console.log('Fetching user...');
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log(`Found user: ${user.id}`);
  
  const [account] = await db.select().from(betterAuthAccounts).where(eq(betterAuthAccounts.userId, user.id)).limit(1);
  if (!account) {
    console.log('Account not found for user');
    return;
  }
  
  console.log('Hashing new password using better-auth...');
  const hashedPassword = await hashPassword(newPassword);
  
  console.log(`Updating password for account: ${account.id}...`);
  await db.update(betterAuthAccounts)
    .set({ password: hashedPassword })
    .where(eq(betterAuthAccounts.id, account.id));
    
  console.log('Password updated successfully!');
}

updateAdminPassword().catch(console.error).then(() => process.exit(0));
