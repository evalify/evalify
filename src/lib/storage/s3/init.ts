import s3Client from "@/lib/storage/s3/s3";
import { logger } from "@/lib/logger";

const PROFILE_IMAGES_BUCKET = "profile-images";

/**
 * Initialize MinIO buckets required for the application
 */
export async function initializeMinIOBuckets() {
    try {
        logger.info("Initializing MinIO buckets...");

        // Check and create profile images bucket
        const profileBucketExists = await s3Client.bucketExists(PROFILE_IMAGES_BUCKET);
        if (!profileBucketExists) {
            await s3Client.createBucket(PROFILE_IMAGES_BUCKET, true);
            logger.info({ bucket: PROFILE_IMAGES_BUCKET }, "Profile images bucket created");
        } else {
            logger.info({ bucket: PROFILE_IMAGES_BUCKET }, "Profile images bucket already exists");
        }

        logger.info("MinIO buckets initialized successfully");
    } catch (error) {
        logger.error({ error }, "Failed to initialize MinIO buckets");
        // Don't throw - let the app continue even if bucket creation fails
    }
}
