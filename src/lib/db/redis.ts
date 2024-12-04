import Redis, { Redis as RedisType } from 'ioredis';

interface Question {
    id: string;
    // Add other question properties based on your actual data structure
}

class RedisClient {
    private static instance: RedisType;
    private static maxRetries = 10;
    private static retryCount = 0;

    private constructor() { }

    public static getInstance(): RedisType {
        if (!RedisClient.instance) {
            const redisUrl = process.env.REDIS_URL;
            if (!redisUrl) {
                throw new Error('REDIS_URL is not defined');
            }
            
            RedisClient.instance = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy(times) {
                    const delay = Math.min(times * 500, 2000);
                    return delay;
                }
            });

            // Add event listeners
            RedisClient.instance.on('error', (err) => {
                console.error('Redis error:', err);
            });

            RedisClient.instance.on('connect', () => {
                console.log('Redis connected');
                RedisClient.retryCount = 0;
            });

            RedisClient.instance.on('reconnecting', () => {
                RedisClient.retryCount++;
                if (RedisClient.retryCount > RedisClient.maxRetries) {
                    console.error('Max Redis reconnection attempts reached');
                    process.exit(1);
                }
                console.log(`Redis reconnecting... Attempt ${RedisClient.retryCount}`);
            });
        }
        return RedisClient.instance;
    }

    public static async getCachedQuestions(key: string): Promise<Question[] | null> {
        try {
            const cached = await RedisClient.instance.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.log('Redis cache error:', error);
            return null;
        }
    }

    public static async setCachedQuestions(key: string, questions: Question[], expiryInSeconds: number = 3600): Promise<void> {
        try {
            await RedisClient.instance.setex(key, expiryInSeconds, JSON.stringify(questions));
        } catch (error) {
            console.log('Redis cache error:', error);
        }
    }
}

export const redis = RedisClient.getInstance();
export const { getCachedQuestions, setCachedQuestions } = RedisClient;
