const { Client } = require('pg');
require('dotenv').config();
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  client.query('ALTER TABLE "music" ADD COLUMN IF NOT EXISTS "coverUrl" text').then(() => {
    console.log('Column added');
    client.end();
  }).catch(e => {
    console.error(e);
    client.end();
  });
});
