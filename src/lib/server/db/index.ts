import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { env } from "$env/dynamic/private"
import * as schema from "./schema.js"

const connectionString = env.DATABASE_URL || process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/drizzle"

const pool = postgres(connectionString)

export const db = drizzle(pool, { schema })

export * from "./schema.js"
