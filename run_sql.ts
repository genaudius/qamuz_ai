import postgres from 'postgres';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
    const query = fs.readFileSync("drizzle/0005_petite_alex_power.sql", "utf8");
    const sql = postgres(process.env.DATABASE_URL!);
    
    // Split the statements by statement-breakpoint
    const statements = query.split('--> statement-breakpoint');
    
    try {
        for (const statement of statements) {
            const trimmed = statement.trim();
            if (trimmed) {
                await sql.unsafe(trimmed);
                console.log("Executed: ", trimmed.slice(0, 50) + "...");
            }
        }
        console.log("SQL executed successfully");
    } catch(e) {
        console.error(e);
    } finally {
        await sql.end();
    }
    process.exit(0);
}
main();
