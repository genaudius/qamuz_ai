import { db } from "./src/lib/server/db/index.js";
import { music } from "./src/lib/server/db/schema.js";

async function main() {
  try {
    const songs = await db.select().from(music).limit(1);
    console.log("Success:", songs);
  } catch (err) {
    console.error("DB Error:", err);
  }
  process.exit(0);
}

main();
