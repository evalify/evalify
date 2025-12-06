import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import s3Client from "@/lib/storage/s3/s3";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

const UPLOADS_BUCKET = process.env.S3_BUCKET_NAME || "evaliify";

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

/**
 * Validate that the file type is in the allowed list
 */
function validateImageMimeType(fileType: string): void {
    if (!ALLOWED_IMAGE_TYPES.includes(fileType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
        throw new Error(
            `Invalid file type: ${fileType}. Only JPEG, PNG, GIF, and WebP images are allowed.`
        );
    }
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
    };
    return mimeToExt[mimeType] || "bin";
}

/**
 * Ensure the uploads bucket exists
 */
async function ensureUploadsBucket() {
    const exists = await s3Client.bucketExists(UPLOADS_BUCKET);
    if (!exists) {
        await s3Client.createBucket(UPLOADS_BUCKET, true);
        logger.info({ bucket: UPLOADS_BUCKET }, "Uploads bucket created");
    }
}

/**
 * File upload router for general file uploads (images, etc.)
 */
export const fileUploadRouter = createTRPCRouter({
    /**
     * Get presigned upload URL for an image
     */
    getImageUploadUrl: protectedProcedure
        .input(
            z.object({
                fileType: z.string(),
                fileName: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Validate MIME type
                validateImageMimeType(input.fileType);

                await ensureUploadsBucket();

                const userId = ctx.session.user.id;
                const fileExtension = getExtensionFromMimeType(input.fileType);
                const uniqueId = randomUUID();
                const key = `images/${userId}/${uniqueId}.${fileExtension}`;

                // Generate presigned URL for upload (valid for 10 minutes)
                const uploadUrl = await s3Client.getPresignedUploadUrl(
                    UPLOADS_BUCKET,
                    key,
                    600,
                    input.fileType
                );

                logger.info(
                    { userId, key, fileType: input.fileType },
                    "Presigned upload URL generated for image"
                );

                return {
                    uploadUrl,
                    key,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id },
                    "Error generating image upload URL"
                );
                throw error;
            }
        }),

    /**
     * Confirm image upload and return the public URL
     */
    confirmImageUpload: protectedProcedure
        .input(
            z.object({
                key: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify the file exists
                const exists = await s3Client.fileExists(UPLOADS_BUCKET, input.key);
                if (!exists) {
                    throw new Error("Uploaded file not found");
                }

                // Construct the public URL using S3_ENDPOINT and S3_PORT
                const endpoint = process.env.S3_ENDPOINT || "";
                const port = process.env.S3_PORT;

                // Parse the endpoint and add port if needed
                let imageUrl: string;
                try {
                    const url = new URL(endpoint);
                    if (port && !url.port) {
                        url.port = port;
                    }
                    imageUrl = `${url.origin}/${UPLOADS_BUCKET}/${input.key}`;
                } catch {
                    // Fallback if URL parsing fails
                    imageUrl = `${endpoint}/${UPLOADS_BUCKET}/${input.key}`;
                }

                logger.info({ userId, key: input.key, imageUrl }, "Image upload confirmed");

                return {
                    success: true,
                    imageUrl,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, key: input.key },
                    "Error confirming image upload"
                );
                throw error;
            }
        }),

    /**
     * Delete an uploaded image
     */
    deleteImage: protectedProcedure
        .input(
            z.object({
                key: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;

                // Security check: ensure the key belongs to the user
                if (!input.key.includes(`/${userId}/`)) {
                    throw new Error("You can only delete your own uploads");
                }

                await s3Client.deleteFile(UPLOADS_BUCKET, input.key);

                logger.info({ userId, key: input.key }, "Image deleted");

                return { success: true };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, key: input.key },
                    "Error deleting image"
                );
                throw error;
            }
        }),
});
