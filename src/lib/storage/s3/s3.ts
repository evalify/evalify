import {
    S3Client,
    CreateBucketCommand,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
    HeadBucketCommand,
    PutBucketPolicyCommand,
    DeleteBucketCommand,
    ListBucketsCommand,
    CopyObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";
import { Readable } from "stream";

/**
 * Configuration for S3Client
 */
interface S3Config {
    endpoint?: string;
    region?: string;
    credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    forcePathStyle?: boolean;
}

/**
 * Upload options
 */
interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: "private" | "public-read" | "public-read-write" | "authenticated-read";
}

/**
 * Singleton S3 Client
 * Compatible with MinIO and AWS S3
 */
class S3ClientSingleton {
    private static instance: S3ClientSingleton;
    private client: S3Client;

    private constructor() {
        // Validate required environment variables
        const endpoint = process.env.S3_ENDPOINT;
        const region = process.env.S3_REGION;
        const accessKeyId = process.env.S3_ACCESS_KEY_ID;
        const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

        if (!endpoint) {
            const error = new Error("S3_ENDPOINT environment variable is required for S3 client");
            logger.error({ error }, "Missing required environment variable");
            throw error;
        }

        if (!region) {
            const error = new Error("S3_REGION environment variable is required for S3 client");
            logger.error({ error }, "Missing required environment variable");
            throw error;
        }

        if (!accessKeyId) {
            const error = new Error(
                "S3_ACCESS_KEY_ID environment variable is required for S3 client"
            );
            logger.error({ error }, "Missing required environment variable");
            throw error;
        }

        if (!secretAccessKey) {
            const error = new Error(
                "S3_SECRET_ACCESS_KEY environment variable is required for S3 client"
            );
            logger.error({ error }, "Missing required environment variable");
            throw error;
        }

        const config: S3Config = {
            endpoint,
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
            forcePathStyle: true, // Required for MinIO/S3 compatible
        };

        this.client = new S3Client(config);
        logger.info({ endpoint: config.endpoint, region: config.region }, "S3 client initialized");
    }

    /**
     * Get the singleton instance of S3ClientSingleton
     */
    public static getInstance(): S3ClientSingleton {
        if (!S3ClientSingleton.instance) {
            S3ClientSingleton.instance = new S3ClientSingleton();
        }
        return S3ClientSingleton.instance;
    }

    /**
     * Get the underlying S3 client
     */
    public getClient(): S3Client {
        return this.client;
    }

    /**
     * Create a new bucket
     */
    public async createBucket(bucketName: string, isPublic: boolean = false): Promise<void> {
        try {
            // Create the bucket
            await this.client.send(
                new CreateBucketCommand({
                    Bucket: bucketName,
                })
            );
            logger.info({ bucketName, isPublic }, "Bucket created successfully");

            // If public, set bucket policy
            if (isPublic) {
                await this.makeBucketPublic(bucketName);
            }
        } catch (error) {
            logger.error({ error, bucketName }, "Failed to create bucket");
            throw error;
        }
    }

    /**
     * Make a bucket public by setting bucket policy
     */
    public async makeBucketPublic(bucketName: string): Promise<void> {
        try {
            const policy = {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Principal: "*",
                        Action: ["s3:GetObject"],
                        Resource: [`arn:aws:s3:::${bucketName}/*`],
                    },
                ],
            };

            await this.client.send(
                new PutBucketPolicyCommand({
                    Bucket: bucketName,
                    Policy: JSON.stringify(policy),
                })
            );
            logger.info({ bucketName }, "Bucket made public");
        } catch (error) {
            logger.error({ error, bucketName }, "Failed to make bucket public");
            throw error;
        }
    }

    /**
     * Check if bucket exists
     */
    public async bucketExists(bucketName: string): Promise<boolean> {
        try {
            await this.client.send(
                new HeadBucketCommand({
                    Bucket: bucketName,
                })
            );
            logger.info({ bucketName }, "Bucket exists");
            return true;
        } catch (_error) {
            logger.warn({ bucketName }, "Bucket does not exist");
            return false;
        }
    }

    /**
     * List all buckets
     */
    public async listBuckets(): Promise<string[]> {
        try {
            const response = await this.client.send(new ListBucketsCommand({}));
            const buckets = response.Buckets?.map((bucket) => bucket.Name || "") || [];
            logger.info({ count: buckets.length }, "Buckets listed");
            return buckets;
        } catch (error) {
            logger.error({ error }, "Failed to list buckets");
            throw error;
        }
    }

    /**
     * Delete a bucket (must be empty)
     */
    public async deleteBucket(bucketName: string): Promise<void> {
        try {
            await this.client.send(
                new DeleteBucketCommand({
                    Bucket: bucketName,
                })
            );
            logger.info({ bucketName }, "Bucket deleted");
        } catch (error) {
            logger.error({ error, bucketName }, "Failed to delete bucket");
            throw error;
        }
    }

    /**
     * Upload a file/object to S3
     */
    public async uploadFile(
        bucketName: string,
        key: string,
        body: Buffer | Uint8Array | Blob | string | Readable,
        options?: UploadOptions
    ): Promise<void> {
        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: body,
                    ContentType: options?.contentType,
                    Metadata: options?.metadata,
                    ACL: options?.acl,
                })
            );
            logger.info(
                { bucketName, key, contentType: options?.contentType },
                "File uploaded successfully"
            );
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to upload file");
            throw error;
        }
    }

    /**
     * Upload JSON data as a file
     */
    public async uploadJSON(
        bucketName: string,
        key: string,
        data: object,
        options?: Omit<UploadOptions, "contentType">
    ): Promise<void> {
        try {
            const body = JSON.stringify(data);
            await this.uploadFile(bucketName, key, body, {
                ...options,
                contentType: "application/json",
            });
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to upload JSON");
            throw error;
        }
    }

    /**
     * Download/get an object from S3
     */
    public async getFile(bucketName: string, key: string): Promise<Uint8Array> {
        try {
            const response = await this.client.send(
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                })
            );

            const chunks: Uint8Array[] = [];
            if (response.Body) {
                for await (const chunk of response.Body as Readable) {
                    chunks.push(chunk);
                }
            }

            const result = Buffer.concat(chunks);
            logger.info({ bucketName, key, size: result.length }, "File retrieved successfully");
            return result;
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to get file");
            throw error;
        }
    }

    /**
     * Get file as string
     */
    public async getFileAsString(bucketName: string, key: string): Promise<string> {
        try {
            const data = await this.getFile(bucketName, key);
            return Buffer.from(data).toString("utf-8");
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to get file as string");
            throw error;
        }
    }

    /**
     * Get and parse JSON file
     */
    public async getJSON<T = unknown>(bucketName: string, key: string): Promise<T> {
        try {
            const data = await this.getFileAsString(bucketName, key);
            return JSON.parse(data) as T;
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to get JSON file");
            throw error;
        }
    }

    /**
     * Delete an object from S3
     */
    public async deleteFile(bucketName: string, key: string): Promise<void> {
        try {
            await this.client.send(
                new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                })
            );
            logger.info({ bucketName, key }, "File deleted successfully");
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to delete file");
            throw error;
        }
    }

    /**
     * List objects in a bucket with optional prefix
     */
    public async listObjects(
        bucketName: string,
        prefix?: string,
        maxKeys?: number
    ): Promise<Array<{ key: string; size: number; lastModified: Date }>> {
        try {
            const response = await this.client.send(
                new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: prefix,
                    MaxKeys: maxKeys,
                })
            );

            const objects =
                response.Contents?.map((obj) => ({
                    key: obj.Key || "",
                    size: obj.Size || 0,
                    lastModified: obj.LastModified || new Date(),
                })) || [];

            logger.info(
                { bucketName, prefix, count: objects.length },
                "Objects listed successfully"
            );
            return objects;
        } catch (error) {
            logger.error({ error, bucketName, prefix }, "Failed to list objects");
            throw error;
        }
    }

    /**
     * Check if an object exists
     */
    public async fileExists(bucketName: string, key: string): Promise<boolean> {
        try {
            await this.client.send(
                new HeadObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                })
            );
            logger.info({ bucketName, key }, "File exists");
            return true;
        } catch (_error) {
            logger.warn({ bucketName, key }, "File does not exist");
            return false;
        }
    }

    /**
     * Get file metadata
     */
    public async getFileMetadata(
        bucketName: string,
        key: string
    ): Promise<{
        contentType?: string;
        contentLength?: number;
        lastModified?: Date;
        metadata?: Record<string, string>;
    }> {
        try {
            const response = await this.client.send(
                new HeadObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                })
            );

            const metadata = {
                contentType: response.ContentType,
                contentLength: response.ContentLength,
                lastModified: response.LastModified,
                metadata: response.Metadata,
            };

            logger.info({ bucketName, key }, "File metadata retrieved");
            return metadata;
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to get file metadata");
            throw error;
        }
    }

    /**
     * Copy an object within S3
     */
    public async copyFile(
        sourceBucket: string,
        sourceKey: string,
        destinationBucket: string,
        destinationKey: string
    ): Promise<void> {
        try {
            await this.client.send(
                new CopyObjectCommand({
                    CopySource: `${sourceBucket}/${sourceKey}`,
                    Bucket: destinationBucket,
                    Key: destinationKey,
                })
            );
            logger.info(
                { sourceBucket, sourceKey, destinationBucket, destinationKey },
                "File copied successfully"
            );
        } catch (error) {
            logger.error(
                { error, sourceBucket, sourceKey, destinationBucket, destinationKey },
                "Failed to copy file"
            );
            throw error;
        }
    }

    /**
     * Generate a presigned URL for temporary access to an object
     */
    public async getPresignedUrl(
        bucketName: string,
        key: string,
        expiresIn: number = 3600
    ): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const url = await getSignedUrl(this.client, command, { expiresIn });
            logger.info({ bucketName, key, expiresIn }, "Presigned URL generated");
            return url;
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to generate presigned URL");
            throw error;
        }
    }

    /**
     * Generate a presigned URL for uploading
     */
    public async getPresignedUploadUrl(
        bucketName: string,
        key: string,
        expiresIn: number = 3600,
        contentType?: string
    ): Promise<string> {
        try {
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                ContentType: contentType,
            });

            const url = await getSignedUrl(this.client, command, { expiresIn });
            logger.info({ bucketName, key, expiresIn }, "Presigned upload URL generated");
            return url;
        } catch (error) {
            logger.error({ error, bucketName, key }, "Failed to generate presigned upload URL");
            throw error;
        }
    }

    /**
     * Delete multiple objects at once
     */
    public async deleteFiles(bucketName: string, keys: string[]): Promise<void> {
        try {
            await Promise.all(keys.map((key) => this.deleteFile(bucketName, key)));
            logger.info({ bucketName, count: keys.length }, "Multiple files deleted successfully");
        } catch (error) {
            logger.error(
                { error, bucketName, count: keys.length },
                "Failed to delete multiple files"
            );
            throw error;
        }
    }
}

// Export singleton instance
export const s3Client = S3ClientSingleton.getInstance();
export default s3Client;
