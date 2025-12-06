import type { NextConfig } from "next";

// Build remotePatterns based on environment
const buildRemotePatterns = () => {
    const patterns = [];

    if (process.env.S3_ENDPOINT && process.env.S3_PORT) {
        try {
            const endpoint = process.env.S3_ENDPOINT.trim();
            if (!endpoint) {
                throw new Error("S3_ENDPOINT is empty");
            }

            const url = new URL(endpoint);

            if (url.protocol !== "http:" && url.protocol !== "https:") {
                throw new Error(
                    `Unsupported S3_ENDPOINT protocol: "${url.protocol}". Only "http:" and "https:" are supported.`
                );
            }

            if (!url.hostname) {
                throw new Error(`S3_ENDPOINT does not contain a valid hostname: "${endpoint}"`);
            }

            const port = process.env.S3_PORT.trim();
            if (!port) {
                throw new Error("S3_PORT is empty");
            }

            const portNumber = parseInt(port, 10);
            if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
                throw new Error(`S3_PORT must be a valid port number (1-65535), got: "${port}"`);
            }

            const protocol = url.protocol.replace(":", "") as "http" | "https";

            patterns.push({
                protocol,
                hostname: url.hostname,
                port: port,
                pathname: "/**",
            });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown error parsing S3 configuration";
            throw new Error(
                `[next.config.ts] Failed to configure S3 remote pattern: ${message}. ` +
                    `Please check S3_ENDPOINT and S3_PORT environment variables.`
            );
        }
    }

    return patterns;
};

const nextConfig: NextConfig = {
    images: {
        remotePatterns: buildRemotePatterns(),
        unoptimized: process.env.NODE_ENV === "development",
    },
    async rewrites() {
        const posthogAssetsHost =
            process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST || "https://us-assets.i.posthog.com";
        const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

        return [
            {
                source: "/ingest/static/:path*",
                destination: `${posthogAssetsHost}/static/:path*`,
            },
            {
                source: "/ingest/:path*",
                destination: `${posthogHost}/:path*`,
            },
        ];
    },
    // This is required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
    output: "standalone",
    // Externalize pino to avoid bundling issues with its test files
    serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
};

export default nextConfig;
