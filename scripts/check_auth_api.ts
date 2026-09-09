import { getAuth } from '../src/lib/auth.js';
import { db } from '../src/lib/server/db/index.js';
import { users } from '../src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

async function generateHash() {
  try {
    const auth = await getAuth();
    // better-auth auth instance might expose password hashing options
    // Let's see what methods it has
    console.log(Object.keys(auth));
    console.log(Object.keys(auth.api));
  } catch (err) {
    console.error(err);
  }
}
generateHash().catch(console.error).then(() => process.exit(0));
