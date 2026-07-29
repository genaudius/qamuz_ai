const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(async () => {
  try {
    const columns = [
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "emailVerifiedBool" boolean NOT NULL DEFAULT false',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "emailVerified" timestamp',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password" text',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "image" text',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isAdmin" boolean NOT NULL DEFAULT false',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "stripeCustomerId" text',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionStatus" text DEFAULT \'incomplete\'',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "planTier" text DEFAULT \'free\'',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "creditBalance" integer DEFAULT 0',
      'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "marketingConsent" boolean NOT NULL DEFAULT false'
    ];

    for (const sql of columns) {
      await client.query(sql);
    }
    console.log('User columns added');
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
