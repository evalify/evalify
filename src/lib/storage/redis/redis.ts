import Redis, { RedisOptions } from "ioredis";
import { logger } from "@/lib/logger";

/**
 * Singleton Redis Client
 * Provides a single instance of Redis connection across the application
 */
class RedisClient {
    private static instance: RedisClient;
    private client: Redis;

    private constructor() {
        // Validate required environment variables
        const host = process.env.REDIS_HOST;
        const port = process.env.REDIS_PORT;
        const password = process.env.REDIS_PASSWORD;

        if (!host) {
            const error = new Error("REDIS_HOST environment variable is required for Redis client");
            logger.error({ error }, "Missing required environment variable");
            throw error;
        }

        if (!port) {
            const error = new Error("REDIS_PORT environment variable is required for Redis client");
            logger.error({ error }, "Missing required environment variable");
            throw error;
        }

        if (!password) {
            const error = new Error(
                "REDIS_PASSWORD environment variable is required for Redis client"
            );
            logger.error({ error }, "Missing required environment variable");
            throw error;
        }

        const options: RedisOptions = {
            host,
            port: parseInt(port),
            password,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger.warn({ times, delay }, "Redis connection retry");
                return delay;
            },
            maxRetriesPerRequest: 3,
        };

        this.client = new Redis(options);

        this.client.on("connect", () => {
            logger.info("Redis client connected successfully");
        });

        this.client.on("error", (error) => {
            logger.error({ error }, "Redis client error");
        });

        this.client.on("ready", () => {
            logger.info("Redis client ready to accept commands");
        });

        this.client.on("close", () => {
            logger.warn("Redis connection closed");
        });
    }

    /**
     * Get the singleton instance of RedisClient
     */
    public static getInstance(): RedisClient {
        if (!RedisClient.instance) {
            RedisClient.instance = new RedisClient();
        }
        return RedisClient.instance;
    }

    /**
     * Get the underlying Redis client
     */
    public getClient(): Redis {
        return this.client;
    }

    /**
     * Set a key-value pair with optional expiration (in seconds)
     */
    public async set(key: string, value: string, expirationSeconds?: number): Promise<boolean> {
        try {
            if (expirationSeconds) {
                await this.client.setex(key, expirationSeconds, value);
            } else {
                await this.client.set(key, value);
            }
            logger.info({ key, hasExpiration: !!expirationSeconds }, "Redis SET successful");
            return true;
        } catch (error) {
            logger.error({ error, key }, "Failed to SET in Redis");
            throw error;
        }
    }

    /**
     * Set a JSON object as value with optional expiration
     */
    public async setJSON(key: string, value: object, expirationSeconds?: number): Promise<boolean> {
        try {
            const jsonString = JSON.stringify(value);
            return await this.set(key, jsonString, expirationSeconds);
        } catch (error) {
            logger.error({ error, key }, "Failed to SET JSON in Redis");
            throw error;
        }
    }

    /**
     * Get value by key
     */
    public async get(key: string): Promise<string | null> {
        try {
            const value = await this.client.get(key);
            logger.info({ key, found: !!value }, "Redis GET");
            return value;
        } catch (error) {
            logger.error({ error, key }, "Failed to GET from Redis");
            throw error;
        }
    }

    /**
     * Get and parse JSON value by key
     */
    public async getJSON<T = unknown>(key: string): Promise<T | null> {
        try {
            const value = await this.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error({ error, key }, "Failed to GET JSON from Redis");
            throw error;
        }
    }

    /**
     * Delete one or more keys
     */
    public async delete(...keys: string[]): Promise<number> {
        try {
            const result = await this.client.del(...keys);
            logger.info({ keys, deletedCount: result }, "Redis DELETE");
            return result;
        } catch (error) {
            logger.error({ error, keys }, "Failed to DELETE from Redis");
            throw error;
        }
    }

    /**
     * Check if key exists
     */
    public async exists(...keys: string[]): Promise<number> {
        try {
            const result = await this.client.exists(...keys);
            logger.info({ keys, existsCount: result }, "Redis EXISTS");
            return result;
        } catch (error) {
            logger.error({ error, keys }, "Failed to check EXISTS in Redis");
            throw error;
        }
    }

    /**
     * Set expiration on a key (in seconds)
     */
    public async expire(key: string, seconds: number): Promise<boolean> {
        try {
            const result = await this.client.expire(key, seconds);
            logger.info({ key, seconds, success: result === 1 }, "Redis EXPIRE");
            return result === 1;
        } catch (error) {
            logger.error({ error, key }, "Failed to EXPIRE in Redis");
            throw error;
        }
    }

    /**
     * Get time to live for a key (in seconds)
     */
    public async ttl(key: string): Promise<number> {
        try {
            const result = await this.client.ttl(key);
            logger.info({ key, ttl: result }, "Redis TTL");
            return result;
        } catch (error) {
            logger.error({ error, key }, "Failed to get TTL from Redis");
            throw error;
        }
    }

    /**
     * List all keys matching a pattern
     */
    public async keys(pattern: string): Promise<string[]> {
        try {
            const keys = await this.client.keys(pattern);
            logger.info({ pattern, count: keys.length }, "Redis KEYS");
            return keys;
        } catch (error) {
            logger.error({ error, pattern }, "Failed to get KEYS from Redis");
            throw error;
        }
    }

    /**
     * Increment a numeric value
     */
    public async increment(key: string, by: number = 1): Promise<number> {
        try {
            const result = await this.client.incrby(key, by);
            logger.info({ key, by, newValue: result }, "Redis INCREMENT");
            return result;
        } catch (error) {
            logger.error({ error, key }, "Failed to INCREMENT in Redis");
            throw error;
        }
    }

    /**
     * Decrement a numeric value
     */
    public async decrement(key: string, by: number = 1): Promise<number> {
        try {
            const result = await this.client.decrby(key, by);
            logger.info({ key, by, newValue: result }, "Redis DECREMENT");
            return result;
        } catch (error) {
            logger.error({ error, key }, "Failed to DECREMENT in Redis");
            throw error;
        }
    }

    /**
     * Add members to a set
     */
    public async addToSet(key: string, ...members: string[]): Promise<number> {
        try {
            const result = await this.client.sadd(key, ...members);
            logger.info({ key, membersCount: members.length, added: result }, "Redis SADD");
            return result;
        } catch (error) {
            logger.error({ error, key }, "Failed to SADD in Redis");
            throw error;
        }
    }

    /**
     * Get all members of a set
     */
    public async getSetMembers(key: string): Promise<string[]> {
        try {
            const members = await this.client.smembers(key);
            logger.info({ key, count: members.length }, "Redis SMEMBERS");
            return members;
        } catch (error) {
            logger.error({ error, key }, "Failed to get SMEMBERS from Redis");
            throw error;
        }
    }

    /**
     * Remove members from a set
     */
    public async removeFromSet(key: string, ...members: string[]): Promise<number> {
        try {
            const result = await this.client.srem(key, ...members);
            logger.info({ key, membersCount: members.length, removed: result }, "Redis SREM");
            return result;
        } catch (error) {
            logger.error({ error, key }, "Failed to SREM from Redis");
            throw error;
        }
    }

    /**
     * Add item to list (push to right)
     */
    public async pushToList(key: string, ...values: string[]): Promise<number> {
        try {
            const result = await this.client.rpush(key, ...values);
            logger.info({ key, valuesCount: values.length, listLength: result }, "Redis RPUSH");
            return result;
        } catch (error) {
            logger.error({ error, key }, "Failed to RPUSH in Redis");
            throw error;
        }
    }

    /**
     * Get list items with range
     */
    public async getListRange(
        key: string,
        start: number = 0,
        stop: number = -1
    ): Promise<string[]> {
        try {
            const items = await this.client.lrange(key, start, stop);
            logger.info({ key, start, stop, count: items.length }, "Redis LRANGE");
            return items;
        } catch (error) {
            logger.error({ error, key }, "Failed to get LRANGE from Redis");
            throw error;
        }
    }

    /**
     * Set hash field
     */
    public async setHash(key: string, field: string, value: string): Promise<number> {
        try {
            const result = await this.client.hset(key, field, value);
            logger.info({ key, field }, "Redis HSET");
            return result;
        } catch (error) {
            logger.error({ error, key, field }, "Failed to HSET in Redis");
            throw error;
        }
    }

    /**
     * Set multiple hash fields
     */
    public async setHashMultiple(key: string, data: Record<string, string>): Promise<"OK"> {
        try {
            const result = await this.client.hmset(key, data);
            logger.info({ key, fieldsCount: Object.keys(data).length }, "Redis HMSET");
            return result;
        } catch (error) {
            logger.error({ error, key }, "Failed to HMSET in Redis");
            throw error;
        }
    }

    /**
     * Get hash field value
     */
    public async getHash(key: string, field: string): Promise<string | null> {
        try {
            const value = await this.client.hget(key, field);
            logger.info({ key, field, found: !!value }, "Redis HGET");
            return value;
        } catch (error) {
            logger.error({ error, key, field }, "Failed to HGET from Redis");
            throw error;
        }
    }

    /**
     * Get all hash fields and values
     */
    public async getAllHash(key: string): Promise<Record<string, string>> {
        try {
            const data = await this.client.hgetall(key);
            logger.info({ key, fieldsCount: Object.keys(data).length }, "Redis HGETALL");
            return data;
        } catch (error) {
            logger.error({ error, key }, "Failed to HGETALL from Redis");
            throw error;
        }
    }

    /**
     * Flush all data from current database
     * WARNING: This will delete all keys!
     */
    public async flushDB(): Promise<void> {
        try {
            await this.client.flushdb();
            logger.warn("Redis database flushed");
        } catch (error) {
            logger.error({ error }, "Failed to flush Redis database");
            throw error;
        }
    }

    /**
     * Ping Redis server
     */
    public async ping(): Promise<string> {
        try {
            const result = await this.client.ping();
            logger.info("Redis PING successful");
            return result;
        } catch (error) {
            logger.error({ error }, "Failed to PING Redis");
            throw error;
        }
    }

    /**
     * Close Redis connection
     */
    public async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            logger.info("Redis client disconnected");
        } catch (error) {
            logger.error({ error }, "Failed to disconnect Redis client");
            throw error;
        }
    }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();
export default redisClient;
