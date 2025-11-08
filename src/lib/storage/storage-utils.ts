/**
 * Storage utility functions
 * Demonstrates common usage patterns for Redis and S3 clients
 */

import { redisClient } from "./redis/redis";
import { s3Client } from "./s3/s3";
import { logger } from "../logger";

/**
 * Cache keys for common operations
 */
export const CacheKeys = {
    user: (userId: string) => `user:${userId}`,
    session: (sessionId: string) => `session:${sessionId}`,
    quiz: (quizId: string) => `quiz:${quizId}`,
    course: (courseId: string) => `course:${courseId}`,
} as const;

/**
 * S3 bucket names
 */
export const S3Buckets = {
    PUBLIC: "evalify-public",
    PRIVATE: "evalify-private",
    UPLOADS: "evalify-uploads",
    BACKUPS: "evalify-backups",
} as const;

/**
 * Initialize default S3 buckets
 */
export async function initializeS3Buckets(): Promise<void> {
    try {
        // Create public bucket
        if (!(await s3Client.bucketExists(S3Buckets.PUBLIC))) {
            await s3Client.createBucket(S3Buckets.PUBLIC, true);
            logger.info({ bucket: S3Buckets.PUBLIC }, "Public bucket created");
        }

        // Create private buckets
        for (const bucket of [S3Buckets.PRIVATE, S3Buckets.UPLOADS, S3Buckets.BACKUPS]) {
            if (!(await s3Client.bucketExists(bucket))) {
                await s3Client.createBucket(bucket, false);
                logger.info({ bucket }, "Private bucket created");
            }
        }

        logger.info("S3 buckets initialized successfully");
    } catch (error) {
        logger.error({ error }, "Failed to initialize S3 buckets");
        throw error;
    }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCacheByPattern(pattern: string): Promise<number> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
        return await redisClient.delete(...keys);
    }
    return 0;
}

/**
 * Health check for storage services
 */
export async function storageHealthCheck(): Promise<{
    redis: boolean;
    s3: boolean;
}> {
    const health = {
        redis: false,
        s3: false,
    };

    try {
        await redisClient.ping();
        health.redis = true;
    } catch (error) {
        logger.error({ error }, "Redis health check failed");
    }

    try {
        await s3Client.listBuckets();
        health.s3 = true;
    } catch (error) {
        logger.error({ error }, "S3 health check failed");
    }

    return health;
}
