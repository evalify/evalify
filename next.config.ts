import type { NextConfig } from "next";

// Build remotePatterns based on environment
const buildRemotePatterns = () => {
    const patterns = [];

    // Only include localhost pattern in development or when explicitly configured
    if (process.env.NODE_ENV === "development") {
        patterns.push({
            protocol: "http" as const,
            hostname: "localhost",
            port: "9000",
            pathname: "/profile-images/**",
        });
    } else if (process.env.MINIO_ENDPOINT && process.env.MINIO_PORT) {
        // Use environment variables for production MinIO endpoint
        try {
            // Validate MINIO_ENDPOINT is a valid URL
            const endpoint = process.env.MINIO_ENDPOINT.trim();
            if (!endpoint) {
                throw new Error("MINIO_ENDPOINT is empty");
            }

            const url = new URL(endpoint);

            // Validate protocol is http or https
            if (url.protocol !== "http:" && url.protocol !== "https:") {
                throw new Error(
                    `Unsupported MINIO_ENDPOINT protocol: "${url.protocol}". Only "http:" and "https:" are supported.`
                );
            }

            // Validate hostname exists
            if (!url.hostname) {
                throw new Error(`MINIO_ENDPOINT does not contain a valid hostname: "${endpoint}"`);
            }

            // Validate MINIO_PORT is numeric
            const port = process.env.MINIO_PORT.trim();
            if (!port) {
                throw new Error("MINIO_PORT is empty");
            }

            const portNumber = parseInt(port, 10);
            if (isNaN(portNumber) || portNumber < 1 || portNumber > 65535) {
                throw new Error(`MINIO_PORT must be a valid port number (1-65535), got: "${port}"`);
            }

            // Convert protocol safely: "http:" -> "http", "https:" -> "https"
            const protocol = url.protocol.replace(":", "") as "http" | "https";

            patterns.push({
                protocol,
                hostname: url.hostname,
                port: port,
                pathname: "/profile-images/**",
            });
        } catch (error) {
            // Provide clear build-time error
            const message =
                error instanceof Error
                    ? error.message
                    : "Unknown error parsing MinIO configuration";
            throw new Error(
                `[next.config.ts] Failed to configure MinIO remote pattern: ${message}. ` +
                    `Please check MINIO_ENDPOINT and MINIO_PORT environment variables.`
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
        return [
            {
                source: "/ingest/static/:path*",
                destination: "https://us-assets.i.posthog.com/static/:path*",
            },
            {
                source: "/ingest/:path*",
                destination: "https://us.i.posthog.com/:path*",
            },
        ];
    },
    // This is required to support PostHog trailing slash API requests
    skipTrailingSlashRedirect: true,
};

export default nextConfig;
