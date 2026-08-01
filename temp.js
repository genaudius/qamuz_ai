import postgres from 'postgres';
const sql = postgres('postgres://postgres:postgres@localhost:5432/qamuz_ai');

async function main() {
    try {
        const result = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
        console.log(result.map(r => r.table_name).join(', '));
    } finally {
        process.exit(0);
    }
}
main().catch(console.error);
