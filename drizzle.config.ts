import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = new URL(process.env.DATABASE_URL || "");

export default defineConfig({
    out: "./drizzle",
    schema: "./src/db/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        host: url.hostname,
        port: parseInt(url.port || "5432"),
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1),
        ssl: {
            rejectUnauthorized: false,
        },
    },
});
