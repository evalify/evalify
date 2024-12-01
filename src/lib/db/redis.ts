import Redis, { Redis as RedisType } from 'ioredis';

class RedisClient {
    private static instance: RedisType;

    private constructor() { }

    public static getInstance(): RedisType {
        if (!RedisClient.instance) {
            const redisUrl = process.env.REDIS_URL;
            if (!redisUrl) {
                throw new Error('REDIS_URL is not defined');
            }
            RedisClient.instance = new Redis(redisUrl);
        }
        return RedisClient.instance;
    }

    public static async getCachedQuestions(key: string): Promise<any | null> {
        try {
            const cached = await RedisClient.instance.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Redis cache error:', error);
            return null;
        }
    }

    public static async setCachedQuestions(key: string, questions: any, expiryInSeconds: number = 3600): Promise<void> {
        try {
            await RedisClient.instance.setex(key, expiryInSeconds, JSON.stringify(questions));
        } catch (error) {
            console.error('Redis cache error:', error);
        }
    }
}

export const redis = RedisClient.getInstance();
export const { getCachedQuestions, setCachedQuestions } = RedisClient;
