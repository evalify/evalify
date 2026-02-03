import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import fs from "fs";
import path from "path";

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
        ssl:
            process.env.DATABASE_ENABLE_SSL === "true"
                ? {
                      rejectUnauthorized: true,
                      ca: process.env.DATABASE_CA_PATH
                          ? fs
                                .readFileSync(
                                    path.resolve(process.cwd(), process.env.DATABASE_CA_PATH)
                                )
                                .toString()
                          : undefined,
                  }
                : false,
    },
});
