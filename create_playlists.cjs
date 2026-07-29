const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "playlist" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "coverUrl" text,
        "isPublic" boolean DEFAULT false NOT NULL,
        "trackCount" integer DEFAULT 0 NOT NULL,
        "createdAt" timestamp DEFAULT now() NOT NULL,
        "updatedAt" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS "playlist_item" (
        "id" text PRIMARY KEY NOT NULL,
        "playlistId" text NOT NULL,
        "musicId" text NOT NULL,
        "position" integer NOT NULL,
        "addedAt" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    console.log('Playlist tables created');
  } catch (e) {
    console.error(e);
  } finally {
    client.end();
  }
});
