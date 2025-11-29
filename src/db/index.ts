import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: process.env.DB_MAX_POOL_SIZE ? parseInt(process.env.DB_MAX_POOL_SIZE) : 10,
    min: process.env.DB_MIN_POOL_SIZE ? parseInt(process.env.DB_MIN_POOL_SIZE) : 0,
    connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT
        ? parseInt(process.env.DB_CONNECTION_TIMEOUT)
        : 5000,
    idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT) : 10000,
});

const db = drizzle({ client: pool, schema });

export { db };
