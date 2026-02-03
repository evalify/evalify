import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: process.env.DB_MAX_POOL_SIZE ? parseInt(process.env.DB_MAX_POOL_SIZE) : 10,
    min: process.env.DB_MIN_POOL_SIZE ? parseInt(process.env.DB_MIN_POOL_SIZE) : 0,
    connectionTimeoutMillis: process.env.DB_CONNECTION_TIMEOUT
        ? parseInt(process.env.DB_CONNECTION_TIMEOUT)
        : 5000,
    idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT) : 10000,
    ssl:
        process.env.DATABASE_ENABLE_SSL === "true"
            ? {
                  rejectUnauthorized: true,
                  ca: process.env.DATABASE_CA_PATH
                      ? fs
                            .readFileSync(path.resolve(process.cwd(), process.env.DATABASE_CA_PATH))
                            .toString()
                      : undefined,
              }
            : false,
});

const db = drizzle({ client: pool, schema });

export { db };
