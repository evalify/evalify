/* eslint-disable @typescript-eslint/no-require-imports */
// This file acts as an entry point for the standalone server
// It is used by PM2 to start the application

const path = require("path");
const fs = require("fs");

// Load environment variables from .env file
// This is important when running with node or pm2 directly without pre-loading .env
const dotenv = require("dotenv");
const result = dotenv.config({ path: path.join(__dirname, ".env") });

if (result.error) {
    console.warn("Warning: .env file not found or could not be loaded.");
}

// Map NEXTAUTH_SECRET to AUTH_SECRET for NextAuth v5 compatibility
if (process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    process.env.AUTH_SECRET = process.env.NEXTAUTH_SECRET;
}

// Ensure NEXTAUTH_URL is set if possible (default to localhost for safety, user should override)
if (!process.env.NEXTAUTH_URL && !process.env.AUTH_URL) {
    console.warn("Warning: NEXTAUTH_URL/AUTH_URL is not set. Defaulting to http://localhost:3000");
    process.env.NEXTAUTH_URL = "http://localhost:3000";
}

// Log critical config (safe values)
console.log("Environment Configuration:");
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || process.env.AUTH_URL || "Not Set"}`);
console.log(`- AUTH_SECRET: ${process.env.AUTH_SECRET ? "Is Set" : "Missing"}`);
console.log(`- AUTH_KEYCLOAK_ID: ${process.env.AUTH_KEYCLOAK_ID || "Missing"}`);
console.log(`- AUTH_KEYCLOAK_ISSUER: ${process.env.AUTH_KEYCLOAK_ISSUER || "Missing"}`);

console.log("Preparing standalone server...");

// Define paths
const projectRoot = __dirname;
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const publicSource = path.join(projectRoot, "public");
const publicDest = path.join(standaloneDir, "public");
const staticSource = path.join(projectRoot, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");

// Helper to copy directories
const copyDir = (src, dest) => {
    if (fs.existsSync(src)) {
        // Ensure destination parent directory exists
        const destParent = path.dirname(dest);
        if (!fs.existsSync(destParent)) {
            fs.mkdirSync(destParent, { recursive: true });
        }

        console.log(`Copying ${src} => ${dest}...`);

        try {
            // cpSync is available in Node >16.7
            fs.cpSync(src, dest, { recursive: true, force: true });
        } catch (error) {
            console.error(`Error copying ${src} to ${dest}:`, error);
        }
    } else {
        console.warn(`Warning: Source directory not found: ${src}`);
    }
};

// Copy static assets to standalone directory
copyDir(publicSource, publicDest);
copyDir(staticSource, staticDest);

console.log("Assets copied. Starting standalone server...");

const standaloneServerPath = path.join(standaloneDir, "server.js");

if (fs.existsSync(standaloneServerPath)) {
    require(standaloneServerPath);
} else {
    console.error(`Error: Standalone server not found at ${standaloneServerPath}`);
    console.error(
        "Please ensure you have run 'bun run build' or 'next build' with 'output: standalone' in next.config.ts"
    );
    process.exit(1);
}
