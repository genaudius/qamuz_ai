import { db, adminSettings } from './src/lib/server/db/index.js';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const result = await db.delete(adminSettings).where(eq(adminSettings.category, 'cloud_storage'));
    console.log('Cleared cloud_storage settings from DB.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
