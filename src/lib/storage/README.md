# Storage Library

Singleton clients for Redis and S3 (MinIO) storage with comprehensive functionality and logging.

## Overview

This library provides production-ready singleton clients for:

- **Redis**: Key-value caching and data storage
- **S3/MinIO**: Object storage for files and assets

Both clients include extensive logging, error handling, and type safety.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Redis Client](#redis-client)
- [S3 Client](#s3-client)
- [Storage Utilities](#storage-utilities)
- [Usage Examples](#usage-examples)

## Installation

Required packages are already installed:

```bash
pnpm add ioredis @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Environment Variables

### Required Environment Variables

All environment variables are **required** and the clients will throw errors if they are missing.

#### Redis Configuration

```env
REDIS_HOST=172.17.9.74          # Redis server hostname
REDIS_PORT=6379                 # Redis server port
REDIS_PASSWORD=valkey123        # Redis authentication password
```

#### S3/MinIO Configuration

```env
# MinIO/S3 Endpoint
MINIO_ENDPOINT=http://172.17.9.74:9000

# AWS Region (required even for MinIO)
AWS_REGION=us-east-1

# Credentials (use either MINIO_* or AWS_* variables)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# OR for AWS S3
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Validation

Both clients validate environment variables on initialization and will throw descriptive errors if any are missing:

```typescript
// ❌ Will throw: "REDIS_HOST environment variable is required for Redis client"
// ❌ Will throw: "MINIO_ENDPOINT environment variable is required for S3 client"
```

## Redis Client

### Import

```typescript
import { redisClient } from "@/lib/storage/redis/redis";
```

### Basic Operations

#### Set/Get String Values

```typescript
// Set a value
await redisClient.set("user:123", "John Doe");

// Set with expiration (in seconds)
await redisClient.set("session:abc", "token-data", 3600); // Expires in 1 hour

// Get a value
const value = await redisClient.get("user:123");
```

#### JSON Operations

```typescript
// Store JSON object
const user = { id: 123, name: "John Doe", email: "john@example.com" };
await redisClient.setJSON("user:123", user, 3600);

// Retrieve JSON object
const userData = await redisClient.getJSON<User>("user:123");
```

#### Key Management

```typescript
// Delete keys
await redisClient.delete("user:123");
await redisClient.delete("user:123", "user:456", "user:789"); // Multiple keys

// Check if key exists
const exists = await redisClient.exists("user:123"); // Returns count

// Get time to live
const ttl = await redisClient.ttl("session:abc"); // Returns seconds, -1 if no expiry, -2 if doesn't exist

// Set expiration on existing key
await redisClient.expire("user:123", 7200); // 2 hours

// List keys by pattern
const userKeys = await redisClient.keys("user:*");
```

### Advanced Operations

#### Counters

```typescript
// Increment counter
const views = await redisClient.increment("page:views");
const viewsBy10 = await redisClient.increment("page:views", 10);

// Decrement counter
const stock = await redisClient.decrement("product:stock");
```

#### Sets

```typescript
// Add to set
await redisClient.addToSet("user:123:tags", "developer", "admin");

// Get all set members
const tags = await redisClient.getSetMembers("user:123:tags");

// Remove from set
await redisClient.removeFromSet("user:123:tags", "admin");
```

#### Lists

```typescript
// Push to list
await redisClient.pushToList("notifications:user:123", "New message", "New follower");

// Get list range (0, -1 gets all)
const notifications = await redisClient.getListRange("notifications:user:123", 0, 9); // First 10
```

#### Hashes

```typescript
// Set hash field
await redisClient.setHash("user:123:profile", "name", "John Doe");

// Set multiple hash fields
await redisClient.setHashMultiple("user:123:profile", {
    name: "John Doe",
    email: "john@example.com",
    age: "30",
});

// Get hash field
const name = await redisClient.getHash("user:123:profile", "name");

// Get all hash fields
const profile = await redisClient.getAllHash("user:123:profile");
```

### Utility Methods

```typescript
// Health check
const pong = await redisClient.ping(); // Returns "PONG"

// Flush database (⚠️ DANGEROUS - deletes all keys!)
await redisClient.flushDB();

// Disconnect
await redisClient.disconnect();
```

## S3 Client

### Import

```typescript
import { s3Client } from "@/lib/storage/s3/s3";
```

### Bucket Management

```typescript
// Create a private bucket
await s3Client.createBucket("my-private-bucket");

// Create a public bucket
await s3Client.createBucket("my-public-bucket", true);

// Check if bucket exists
const exists = await s3Client.bucketExists("my-bucket");

// Make existing bucket public
await s3Client.makeBucketPublic("my-bucket");

// List all buckets
const buckets = await s3Client.listBuckets();

// Delete bucket (must be empty)
await s3Client.deleteBucket("my-bucket");
```

### File Upload

```typescript
// Upload buffer/string
const fileBuffer = Buffer.from("Hello, World!");
await s3Client.uploadFile("my-bucket", "files/hello.txt", fileBuffer, {
    contentType: "text/plain",
    metadata: { uploadedBy: "user123" },
});

// Upload JSON
const data = { id: 1, name: "Test" };
await s3Client.uploadJSON("my-bucket", "data/test.json", data);

// Upload with public access
await s3Client.uploadFile("my-bucket", "public/image.jpg", imageBuffer, {
    contentType: "image/jpeg",
    acl: "public-read",
});
```

### File Download

```typescript
// Get file as buffer
const buffer = await s3Client.getFile("my-bucket", "files/hello.txt");

// Get file as string
const content = await s3Client.getFileAsString("my-bucket", "files/hello.txt");

// Get and parse JSON
const data = await s3Client.getJSON<MyType>("my-bucket", "data/test.json");
```

### File Operations

```typescript
// Check if file exists
const exists = await s3Client.fileExists("my-bucket", "files/hello.txt");

// Get file metadata
const metadata = await s3Client.getFileMetadata("my-bucket", "files/hello.txt");
// Returns: { contentType, contentLength, lastModified, metadata }

// Copy file
await s3Client.copyFile("source-bucket", "files/original.txt", "dest-bucket", "files/copy.txt");

// Delete file
await s3Client.deleteFile("my-bucket", "files/hello.txt");

// Delete multiple files
await s3Client.deleteFiles("my-bucket", ["file1.txt", "file2.txt", "file3.txt"]);
```

### List Objects

```typescript
// List all objects in bucket
const objects = await s3Client.listObjects("my-bucket");

// List with prefix
const images = await s3Client.listObjects("my-bucket", "images/");

// List with limit
const recent = await s3Client.listObjects("my-bucket", undefined, 10);

// Response format
objects.forEach((obj) => {
    console.log(obj.key, obj.size, obj.lastModified);
});
```

### Presigned URLs

```typescript
// Generate download URL (valid for 1 hour by default)
const downloadUrl = await s3Client.getPresignedUrl("my-bucket", "files/document.pdf");

// Custom expiration (in seconds)
const url = await s3Client.getPresignedUrl("my-bucket", "files/document.pdf", 7200); // 2 hours

// Generate upload URL
const uploadUrl = await s3Client.getPresignedUploadUrl(
    "my-bucket",
    "uploads/new-file.jpg",
    3600,
    "image/jpeg"
);
```

## Storage Utilities

### Import

```typescript
import {
    CacheKeys,
    S3Buckets,
    initializeS3Buckets,
    cacheGetOrSet,
    uploadFileWithCache,
    invalidateCacheByPattern,
    storageHealthCheck,
} from "@/lib/storage/storage-utils";
```

### Predefined Keys and Buckets

```typescript
// Cache key helpers
const userKey = CacheKeys.user("123"); // "user:123"
const sessionKey = CacheKeys.session("abc"); // "session:abc"
const quizKey = CacheKeys.quiz("456"); // "quiz:456"

// Bucket names
S3Buckets.PUBLIC; // "evalify-public"
S3Buckets.PRIVATE; // "evalify-private"
S3Buckets.UPLOADS; // "evalify-uploads"
S3Buckets.BACKUPS; // "evalify-backups"
```

### Initialize Buckets

```typescript
// Create default buckets on app startup
await initializeS3Buckets();
```

### Cache-Aside Pattern

```typescript
// Get from cache or fetch and cache
const user = await cacheGetOrSet(
    CacheKeys.user("123"),
    async () => {
        // This function only runs on cache miss
        return await db.users.findById("123");
    },
    3600 // Cache for 1 hour
);
```

### Upload with Caching

```typescript
// Upload file and cache metadata
const url = await uploadFileWithCache(
    S3Buckets.UPLOADS,
    "avatars/user-123.jpg",
    imageBuffer,
    "image/jpeg"
);
// Returns public URL or presigned URL depending on bucket
```

### Cache Invalidation

```typescript
// Invalidate all user caches
const deletedCount = await invalidateCacheByPattern("user:*");

// Invalidate specific quiz caches
await invalidateCacheByPattern("quiz:123:*");
```

### Health Check

```typescript
// Check storage services health
const health = await storageHealthCheck();
// Returns: { redis: boolean, s3: boolean }

if (health.redis && health.s3) {
    console.log("All storage services are healthy");
}
```

## Usage Examples

### Caching Database Queries

```typescript
import { redisClient } from "@/lib/storage/redis/redis";
import { CacheKeys } from "@/lib/storage/storage-utils";

async function getUser(userId: string) {
    const cacheKey = CacheKeys.user(userId);

    // Try cache first
    const cached = await redisClient.getJSON<User>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const user = await db.users.findById(userId);

    // Cache for 1 hour
    await redisClient.setJSON(cacheKey, user, 3600);

    return user;
}
```

### File Upload with Storage

```typescript
import { s3Client } from "@/lib/storage/s3/s3";
import { S3Buckets } from "@/lib/storage/storage-utils";

async function uploadAvatar(userId: string, file: File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `avatars/${userId}.jpg`;

    // Upload to S3
    await s3Client.uploadFile(S3Buckets.PUBLIC, key, buffer, {
        contentType: file.type,
        metadata: { userId },
    });

    // Return public URL
    const endpoint = process.env.MINIO_ENDPOINT;
    return `${endpoint}/${S3Buckets.PUBLIC}/${key}`;
}
```

### Session Management

```typescript
import { redisClient } from "@/lib/storage/redis/redis";

async function createSession(userId: string, sessionData: object) {
    const sessionId = generateId();
    const key = `session:${sessionId}`;

    await redisClient.setJSON(
        key,
        {
            userId,
            ...sessionData,
            createdAt: new Date(),
        },
        86400
    ); // 24 hours

    return sessionId;
}

async function getSession(sessionId: string) {
    return await redisClient.getJSON(`session:${sessionId}`);
}

async function deleteSession(sessionId: string) {
    await redisClient.delete(`session:${sessionId}`);
}
```

### Rate Limiting

```typescript
import { redisClient } from "@/lib/storage/redis/redis";

async function checkRateLimit(userId: string, maxRequests: number = 100): Promise<boolean> {
    const key = `ratelimit:${userId}:${(Date.now() / 60000) | 0}`; // Per minute

    const current = await redisClient.increment(key);

    if (current === 1) {
        await redisClient.expire(key, 60); // Expire after 1 minute
    }

    return current <= maxRequests;
}
```

### Leaderboard with Sorted Sets

```typescript
import { redisClient } from "@/lib/storage/redis/redis";

async function updateScore(userId: string, score: number) {
    const client = redisClient.getClient();
    await client.zadd("leaderboard", score, userId);
}

async function getTopPlayers(count: number = 10) {
    const client = redisClient.getClient();
    return await client.zrevrange("leaderboard", 0, count - 1, "WITHSCORES");
}
```

### Quiz File Storage

```typescript
import { s3Client } from "@/lib/storage/s3/s3";
import { S3Buckets } from "@/lib/storage/storage-utils";

async function saveQuizAttachment(quizId: string, file: File) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `quizzes/${quizId}/attachments/${file.name}`;

    await s3Client.uploadFile(S3Buckets.PRIVATE, key, buffer, {
        contentType: file.type,
        metadata: { quizId },
    });

    // Generate temporary access URL (1 hour)
    return await s3Client.getPresignedUrl(S3Buckets.PRIVATE, key, 3600);
}
```

## Best Practices

### 1. Use Appropriate TTL Values

```typescript
// Short-lived data (sessions, tokens)
await redisClient.setJSON("session:abc", data, 3600); // 1 hour

// Medium-lived data (user profiles, settings)
await redisClient.setJSON("user:123", data, 86400); // 24 hours

// Long-lived data (static content, configs)
await redisClient.setJSON("config:app", data, 604800); // 7 days
```

### 2. Use Namespaced Keys

```typescript
// Good - organized and easy to invalidate
"user:123:profile";
"user:123:settings";
"quiz:456:questions";

// Avoid - hard to manage
"user123profile";
"quiz456";
```

### 3. Handle Errors Gracefully

```typescript
try {
    const data = await redisClient.getJSON("key");
    if (!data) {
        // Handle cache miss
    }
} catch (error) {
    // Log and fallback to database
    logger.error({ error }, "Cache error");
    return await fetchFromDatabase();
}
```

### 4. Choose Right Bucket Visibility

```typescript
// Public buckets - for assets served directly (images, CSS, JS)
await s3Client.createBucket(S3Buckets.PUBLIC, true);

// Private buckets - for user data, sensitive files
await s3Client.createBucket(S3Buckets.PRIVATE, false);

// Use presigned URLs for temporary access to private files
const url = await s3Client.getPresignedUrl(S3Buckets.PRIVATE, key, 3600);
```

### 5. Batch Operations

```typescript
// Good - batch deletes
await s3Client.deleteFiles("bucket", ["file1", "file2", "file3"]);

// Good - batch cache invalidation
await invalidateCacheByPattern("user:123:*");
```

## Error Handling

Both clients include comprehensive error logging:

```typescript
// Errors are automatically logged with context
try {
    await s3Client.uploadFile("bucket", "key", data);
} catch (error) {
    // Error already logged with: { error, bucketName, key }
    // Handle error appropriately
}
```

## Health Monitoring

```typescript
// In your health check endpoint
import { storageHealthCheck } from "@/lib/storage/storage-utils";

export async function GET() {
    const health = await storageHealthCheck();

    return Response.json({
        status: health.redis && health.s3 ? "healthy" : "degraded",
        services: health,
    });
}
```

## Logging

All operations are logged using the application logger (`@/lib/logger`):

- **Info**: Successful operations with key details
- **Warn**: Retries, non-critical issues
- **Error**: Failed operations with full context

Check logs for debugging and monitoring.

## TypeScript Support

Both clients are fully typed. Use generic types for JSON operations:

```typescript
interface User {
    id: string;
    name: string;
    email: string;
}

const user = await redisClient.getJSON<User>("user:123");
const users = await s3Client.getJSON<User[]>("bucket", "users.json");
```

## License

Part of the Evalify project.
