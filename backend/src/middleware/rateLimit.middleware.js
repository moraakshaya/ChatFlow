import rateLimit, { MemoryStore } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { RATE_LIMIT_CONFIG } from "../config/rateLimit.config.js";
import { redisClient } from "../config/redis.config.js";
import logger from "../utils/logger.js";

// Helper to format consistent error response
const handler = (message) => (req, res) => {
    res.status(429).json({
        success: false,
        message,
        retryAfter: res.getHeader("Retry-After")
    });
};

/**
 * Resilient Store that uses Redis when available, and falls back to MemoryStore when down.
 */
class ResilientStore {
    constructor(options) {
        this.redisStore = new RedisStore({
            sendCommand: (...args) => redisClient.call(...args),
            prefix: options.prefix || "rl:"
        });
        this.memoryStore = new MemoryStore();
    }

    init(options) {
        this.memoryStore.init(options);
        // rate-limit-redis doesn't strictly need init in v3/v4 but we pass it anyway if it supports it
        if (typeof this.redisStore.init === "function") {
            this.redisStore.init(options);
        }
    }

    async increment(key) {
        if (redisClient.status === "ready") {
            try {
                return await this.redisStore.increment(key);
            } catch (err) {
                logger.warn({ event: "rate_limit.redis_error", error: err.message }, "Redis rate limit failed, falling back to memory");
            }
        }
        return this.memoryStore.increment(key);
    }

    async decrement(key) {
        if (redisClient.status === "ready") {
            try {
                return await this.redisStore.decrement(key);
            } catch (err) {}
        }
        return this.memoryStore.decrement(key);
    }

    async resetKey(key) {
        if (redisClient.status === "ready") {
            try {
                return await this.redisStore.resetKey(key);
            } catch (err) {}
        }
        return this.memoryStore.resetKey(key);
    }
}

/**
 * Authentication Rate Limiter (Stricter, IP-based + account identifier if present)
 */
export const authRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.REST.AUTH.windowMs,
    max: RATE_LIMIT_CONFIG.REST.AUTH.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: false },
    store: new ResilientStore({ prefix: "rl:auth:" }),
    keyGenerator: (req) => {
        const accountId = req.body.email || req.body.username || "";
        return `${req.ip}_${accountId}`;
    },
    handler: handler(RATE_LIMIT_CONFIG.REST.AUTH.message)
});

/**
 * General API Rate Limiter (User ID based, fallback to IP)
 */
export const generalRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.REST.GENERAL_API.windowMs,
    max: RATE_LIMIT_CONFIG.REST.GENERAL_API.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: false },
    store: new ResilientStore({ prefix: "rl:general:" }),
    keyGenerator: (req) => {
        return req.user ? req.user._id.toString() : req.ip;
    },
    handler: handler(RATE_LIMIT_CONFIG.REST.GENERAL_API.message)
});

/**
 * Message Creation Rate Limiter (User ID based)
 */
export const messageRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.REST.MESSAGE.windowMs,
    max: RATE_LIMIT_CONFIG.REST.MESSAGE.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: false },
    store: new ResilientStore({ prefix: "rl:message:" }),
    keyGenerator: (req) => {
        return req.user ? req.user._id.toString() : req.ip;
    },
    handler: handler(RATE_LIMIT_CONFIG.REST.MESSAGE.message)
});

/**
 * Search Rate Limiter (User ID based)
 */
export const searchRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.REST.SEARCH.windowMs,
    max: RATE_LIMIT_CONFIG.REST.SEARCH.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: false },
    store: new ResilientStore({ prefix: "rl:search:" }),
    keyGenerator: (req) => {
        return req.user ? req.user._id.toString() : req.ip;
    },
    handler: handler(RATE_LIMIT_CONFIG.REST.SEARCH.message)
});

/**
 * Sensitive Operation Rate Limiter (IP / User ID based)
 */
export const sensitiveRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.REST.SENSITIVE.windowMs,
    max: RATE_LIMIT_CONFIG.REST.SENSITIVE.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: false },
    store: new ResilientStore({ prefix: "rl:sensitive:" }),
    keyGenerator: (req) => {
        return req.user ? req.user._id.toString() : req.ip;
    },
    handler: handler(RATE_LIMIT_CONFIG.REST.SENSITIVE.message)
});

/**
 * Per API Key Rate Limiter
 */
export const perKeyRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.REST.API_KEY.windowMs,
    max: RATE_LIMIT_CONFIG.REST.API_KEY.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, default: false },
    store: new ResilientStore({ prefix: "rl:apikey:" }),
    keyGenerator: (req) => {
        return req.apiContext && req.apiContext.keyId ? req.apiContext.keyId : req.ip;
    },
    handler: handler(RATE_LIMIT_CONFIG.REST.API_KEY.message)
});
