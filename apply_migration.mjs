import postgres from 'postgres';
import fs from 'fs';

const sqlFile = fs.readFileSync('drizzle/0004_mean_randall.sql', 'utf8');
const statements = sqlFile.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  try {
    for (const statement of statements) {
      console.log(`Executing: ${statement}`);
      try {
        await sql.unsafe(statement);
      } catch (err) {
        if (err.code === '42701' || err.code === '42P07') {
          console.log(`Ignoring already exists error: ${err.message}`);
        } else {
          throw err;
        }
      }
    }
    console.log('Migration applied successfully.');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await sql.end();
  }
}

main();
