import Redis from "ioredis";
import logger from "../utils/logger.js";

const REDIS_URI = process.env.REDIS_URI || "redis://localhost:6379";

const createRedisClient = (clientName) => {
    const client = new Redis(REDIS_URI, {
        retryStrategy: (times) => {
            // Reconnect after
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: null // Don't throw errors, buffer them if needed by Socket.IO
    });

    client.on("connect", () => {
        logger.info({ event: "redis.connect", clientName }, `Redis ${clientName} connected`);
    });

    client.on("error", (err) => {
        logger.error({ event: "redis.error", clientName, error: err.message }, `Redis ${clientName} error`);
    });

    client.on("close", () => {
        logger.warn({ event: "redis.close", clientName }, `Redis ${clientName} connection closed`);
    });

    return client;
};

// Main client for general application data, rate limiting, and presence
export const redisClient = createRedisClient("main");

// Sub client required by Socket.IO Redis Adapter
export const subClient = createRedisClient("sub");
