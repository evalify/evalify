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
        const url = new URL(process.env.MINIO_ENDPOINT);
        patterns.push({
            protocol: url.protocol.replace(":", "") as "http" | "https",
            hostname: url.hostname,
            port: process.env.MINIO_PORT,
            pathname: "/profile-images/**",
        });
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
