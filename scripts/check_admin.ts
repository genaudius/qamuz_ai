import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = postgres(connectionString!);
  const db = drizzle(pool, { schema });
  
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, 'genaudius@gmail.com')
  });

  if (user) {
    const accounts = await db.query.betterAuthAccounts.findMany({
      where: eq(schema.betterAuthAccounts.userId, user.id)
    });
    console.log("Account passwords:", accounts.map(a => a.password));
  }
  process.exit(0);
}
main().catch(console.error);
