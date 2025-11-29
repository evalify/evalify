import { createTRPCRouter, protectedProcedure, adminProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import s3Client from "@/lib/storage/s3/s3";
import { logger } from "@/lib/logger";
import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

const PROFILE_IMAGES_BUCKET = "profile-images";

// Strict whitelist of allowed MIME types
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Validate that the file type is in the allowed whitelist
 */
function validateMimeType(fileType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(fileType as (typeof ALLOWED_MIME_TYPES)[number])) {
        throw new Error(
            `Invalid file type: ${fileType}. Only JPEG, PNG, and WebP images are allowed.`
        );
    }
}

/**
 * Ensure the profile images bucket exists
 */
async function ensureProfileImagesBucket() {
    const exists = await s3Client.bucketExists(PROFILE_IMAGES_BUCKET);
    if (!exists) {
        await s3Client.createBucket(PROFILE_IMAGES_BUCKET, true);
        logger.info({ bucket: PROFILE_IMAGES_BUCKET }, "Profile images bucket created");
    }
}

/**
 * Profile image upload router
 */
export const profileImageRouter = createTRPCRouter({
    /**
     * Get presigned upload URL for profile image
     */
    getUploadUrl: protectedProcedure
        .input(
            z.object({
                fileType: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Validate MIME type against whitelist
                validateMimeType(input.fileType);

                await ensureProfileImagesBucket();

                const userId = ctx.session.user.id;
                const fileExtension = input.fileType.split("/")[1] || "jpg";
                const key = `${userId}/profile.${fileExtension}`;

                // Generate presigned URL for upload (valid for 10 minutes)
                const uploadUrl = await s3Client.getPresignedUploadUrl(
                    PROFILE_IMAGES_BUCKET,
                    key,
                    600,
                    input.fileType
                );

                logger.info({ userId, key }, "Presigned upload URL generated for profile image");

                return {
                    uploadUrl,
                    key,
                };
            } catch (error) {
                logger.error({ error, userId: ctx.session.user.id }, "Error generating upload URL");
                throw error;
            }
        }),

    /**
     * Confirm profile image upload and update user record
     */
    confirmUpload: protectedProcedure
        .input(
            z.object({
                key: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                const userId = ctx.session.user.id;

                // Verify the file exists
                const exists = await s3Client.fileExists(PROFILE_IMAGES_BUCKET, input.key);
                if (!exists) {
                    throw new Error("Uploaded file not found");
                }

                // Use direct public URL instead of presigned URL
                const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
                const imageUrl = `${endpoint}/${PROFILE_IMAGES_BUCKET}/${input.key}`;

                // Update user's profile image in database
                const [updatedUser] = await db
                    .update(usersTable)
                    .set({ profileImage: imageUrl })
                    .where(eq(usersTable.id, userId))
                    .returning();

                logger.info({ userId, key: input.key }, "Profile image uploaded and confirmed");

                return {
                    success: true,
                    imageUrl: updatedUser.profileImage,
                };
            } catch (error) {
                logger.error(
                    { error, userId: ctx.session.user.id, key: input.key },
                    "Error confirming upload"
                );
                throw error;
            }
        }),

    /**
     * Get current profile image URL
     */
    getProfileImage: protectedProcedure.query(async ({ ctx }) => {
        try {
            const userId = ctx.session.user.id;

            const [user] = await db
                .select({ profileImage: usersTable.profileImage })
                .from(usersTable)
                .where(eq(usersTable.id, userId))
                .limit(1);

            if (!user?.profileImage) {
                return { imageUrl: null };
            }

            // Check if we need to regenerate the URL (for old presigned URLs)
            // If the URL contains query parameters, it's an old presigned URL
            if (user.profileImage.includes("?")) {
                // Find the image by listing objects
                const objects = await s3Client.listObjects(PROFILE_IMAGES_BUCKET, `${userId}/`);

                if (objects.length > 0) {
                    const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
                    const imageUrl = `${endpoint}/${PROFILE_IMAGES_BUCKET}/${objects[0].key}`;

                    // Update the database with the new URL
                    await db
                        .update(usersTable)
                        .set({ profileImage: imageUrl })
                        .where(eq(usersTable.id, userId));

                    return { imageUrl };
                }
            }

            return { imageUrl: user.profileImage };
        } catch (error) {
            logger.error({ error, userId: ctx.session.user.id }, "Error getting profile image");
            return { imageUrl: null };
        }
    }),

    /**
     * Delete profile image
     */
    deleteProfileImage: protectedProcedure.mutation(async ({ ctx }) => {
        try {
            const userId = ctx.session.user.id;

            // List all files for this user
            const objects = await s3Client.listObjects(PROFILE_IMAGES_BUCKET, `${userId}/`);

            // Delete all user's profile images
            if (objects.length > 0) {
                await s3Client.deleteFiles(
                    PROFILE_IMAGES_BUCKET,
                    objects.map((obj) => obj.key)
                );
            }

            // Update user's profile image in database
            await db
                .update(usersTable)
                .set({ profileImage: null })
                .where(eq(usersTable.id, userId));

            logger.info({ userId }, "Profile image deleted");

            return { success: true };
        } catch (error) {
            logger.error({ error, userId: ctx.session.user.id }, "Error deleting profile image");
            throw error;
        }
    }),

    /**
     * ADMIN - Get presigned upload URL for any user's profile image
     */
    adminGetUploadUrl: adminProcedure
        .input(
            z.object({
                userId: z.uuid(),
                fileType: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Validate MIME type against whitelist
                validateMimeType(input.fileType);

                await ensureProfileImagesBucket();

                const fileExtension = input.fileType.split("/")[1] || "jpg";
                const key = `${input.userId}/profile.${fileExtension}`;

                // Generate presigned URL for upload (valid for 10 minutes)
                const uploadUrl = await s3Client.getPresignedUploadUrl(
                    PROFILE_IMAGES_BUCKET,
                    key,
                    600,
                    input.fileType
                );

                logger.info(
                    { adminId: ctx.session.user.id, targetUserId: input.userId, key },
                    "Admin generated presigned upload URL for user profile image"
                );

                return {
                    uploadUrl,
                    key,
                };
            } catch (error) {
                logger.error(
                    { error, adminId: ctx.session.user.id, targetUserId: input.userId },
                    "Error generating upload URL for user"
                );
                throw error;
            }
        }),

    /**
     * ADMIN - Confirm profile image upload for any user and update their record
     */
    adminConfirmUpload: adminProcedure
        .input(
            z.object({
                userId: z.uuid(),
                key: z.string(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Verify the file exists
                const exists = await s3Client.fileExists(PROFILE_IMAGES_BUCKET, input.key);
                if (!exists) {
                    throw new Error("Uploaded file not found");
                }

                // Use direct public URL instead of presigned URL
                const endpoint = process.env.MINIO_ENDPOINT || "http://localhost:9000";
                const imageUrl = `${endpoint}/${PROFILE_IMAGES_BUCKET}/${input.key}`;

                // Update user's profile image in database
                const [updatedUser] = await db
                    .update(usersTable)
                    .set({ profileImage: imageUrl })
                    .where(eq(usersTable.id, input.userId))
                    .returning();

                logger.info(
                    { adminId: ctx.session.user.id, targetUserId: input.userId, key: input.key },
                    "Admin uploaded profile image for user"
                );

                return {
                    success: true,
                    imageUrl: updatedUser.profileImage,
                };
            } catch (error) {
                logger.error(
                    {
                        error,
                        adminId: ctx.session.user.id,
                        targetUserId: input.userId,
                        key: input.key,
                    },
                    "Error confirming upload for user"
                );
                throw error;
            }
        }),

    /**
     * ADMIN - Delete profile image for any user
     */
    adminDeleteProfileImage: adminProcedure
        .input(
            z.object({
                userId: z.uuid(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // List all files for this user
                const objects = await s3Client.listObjects(
                    PROFILE_IMAGES_BUCKET,
                    `${input.userId}/`
                );

                // Delete all user's profile images
                if (objects.length > 0) {
                    await s3Client.deleteFiles(
                        PROFILE_IMAGES_BUCKET,
                        objects.map((obj) => obj.key)
                    );
                }

                // Update user's profile image in database
                await db
                    .update(usersTable)
                    .set({ profileImage: null })
                    .where(eq(usersTable.id, input.userId));

                logger.info(
                    { adminId: ctx.session.user.id, targetUserId: input.userId },
                    "Admin deleted profile image for user"
                );

                return { success: true };
            } catch (error) {
                logger.error(
                    { error, adminId: ctx.session.user.id, targetUserId: input.userId },
                    "Error deleting profile image for user"
                );
                throw error;
            }
        }),
});
