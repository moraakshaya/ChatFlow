import { redisClient } from "../config/redis.config.js";
import logger from "../utils/logger.js";

/**
 * In-memory fallback store: Map<userId, Set<socketId>>
 *
 * Used automatically when Redis is unavailable (e.g. local dev without Redis).
 * Resets on server restart — acceptable for ephemeral presence state.
 */
const memoryStore = new Map();

/**
 * Presence Service — Redis-backed with automatic in-memory fallback.
 *
 * Tracks active Socket.IO connections per user so we can determine
 * online/offline status correctly across multiple browser tabs/devices.
 */
class PresenceService {
    // ── Helpers ─────────────────────────────────────────────────────────────

    get _redisReady() {
        return redisClient.status === "ready";
    }

    _getRedisKey(userId) {
        return `presence:sockets:${userId}`;
    }

    // ── Memory store helpers ─────────────────────────────────────────────────

    _memAdd(userId, socketId) {
        if (!memoryStore.has(userId)) {
            memoryStore.set(userId, new Set());
        }
        const sockets = memoryStore.get(userId);
        const wasEmpty = sockets.size === 0;
        sockets.add(socketId);
        return wasEmpty; // true = transitioned offline → online
    }

    _memRemove(userId, socketId) {
        const sockets = memoryStore.get(userId);
        if (!sockets) return false;
        sockets.delete(socketId);
        const isEmpty = sockets.size === 0;
        if (isEmpty) memoryStore.delete(userId);
        return isEmpty; // true = transitioned online → offline
    }

    _memIsOnline(userId) {
        const sockets = memoryStore.get(userId);
        return !!(sockets && sockets.size > 0);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Registers a new socket connection for a user.
     * @returns {Promise<boolean>} true if user transitioned from OFFLINE → ONLINE.
     */
    async registerSocket(userId, socketId) {
        if (!this._redisReady) {
            const isNewOnline = this._memAdd(userId, socketId);
            logger.debug({ userId, socketId, isNewOnline }, "[Presence][mem] registerSocket");
            return isNewOnline;
        }

        const key = this._getRedisKey(userId);
        const results = await redisClient.multi()
            .scard(key)           // size before add
            .sadd(key, socketId)  // add socket
            .expire(key, 86400)   // 24h TTL as safety net
            .exec();

        const previousCount = results[0][1];
        return previousCount === 0;
    }

    /**
     * Removes a socket connection for a user.
     * @returns {Promise<boolean>} true if user transitioned from ONLINE → OFFLINE.
     */
    async removeSocket(userId, socketId) {
        if (!this._redisReady) {
            const isNowOffline = this._memRemove(userId, socketId);
            logger.debug({ userId, socketId, isNowOffline }, "[Presence][mem] removeSocket");
            return isNowOffline;
        }

        const key = this._getRedisKey(userId);
        const results = await redisClient.multi()
            .srem(key, socketId)  // remove socket
            .scard(key)           // size after removal
            .exec();

        const remainingCount = results[1][1];
        return remainingCount === 0;
    }

    /**
     * Checks if a user is currently online.
     * @returns {Promise<boolean>}
     */
    async isOnline(userId) {
        if (!this._redisReady) {
            return this._memIsOnline(userId);
        }
        const count = await redisClient.scard(this._getRedisKey(userId));
        return count > 0;
    }

    /**
     * Retrieves the presence status for a specific user.
     * @returns {Promise<{ userId: string, status: 'online'|'offline' }>}
     */
    async getUserPresence(userId) {
        return {
            userId,
            status: (await this.isOnline(userId)) ? "online" : "offline"
        };
    }

    /**
     * Retrieves the presence status for an array of users.
     * @returns {Promise<Array<{ userId: string, status: 'online'|'offline' }>>}
     */
    async getUsersPresence(userIds) {
        return Promise.all(userIds.map(userId => this.getUserPresence(userId)));
    }

    /**
     * Returns the active socket IDs for a user.
     * @returns {Promise<string[]>}
     */
    async getActiveSockets(userId) {
        if (!this._redisReady) {
            const sockets = memoryStore.get(userId);
            return sockets ? [...sockets] : [];
        }
        return redisClient.smembers(this._getRedisKey(userId));
    }
}

export const presenceService = new PresenceService();
