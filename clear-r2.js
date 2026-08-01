import postgres from 'postgres';
const sql = postgres('postgres://postgres:postgres@localhost:5432/qamuz_ai');

async function run() {
  try {
    await sql`DELETE FROM admin_settings WHERE category = 'cloud_storage'`;
    console.log('Cleared cloud_storage from db');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
