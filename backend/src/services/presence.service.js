import { redisClient } from "../config/redis.config.js";
import logger from "../utils/logger.js";

/**
 * Redis-backed Presence Service
 * Manages active Socket.IO connections per user and determines online/offline status using Redis Sets.
 */
class PresenceService {
    getPrefix(userId) {
        return `presence:sockets:${userId}`;
    }

    /**
     * Registers a new socket connection for a user.
     * @returns {Promise<boolean>} true if the user transitioned from offline to online (0 -> 1 socket).
     */
    async registerSocket(userId, socketId) {
        if (redisClient.status !== "ready") return false;

        const key = this.getPrefix(userId);
        
        // Multi to ensure atomicity
        const results = await redisClient.multi()
            .scard(key) // Check size before adding
            .sadd(key, socketId) // Add the socket
            .expire(key, 86400) // 24 hour TTL to prevent stale sockets if server crashes ungracefully
            .exec();
        
        const previousCount = results[0][1];
        return previousCount === 0;
    }

    /**
     * Removes a socket connection for a user.
     * @returns {Promise<boolean>} true if the user transitioned from online to offline (1 -> 0 sockets).
     */
    async removeSocket(userId, socketId) {
        if (redisClient.status !== "ready") return false;

        const key = this.getPrefix(userId);
        
        const results = await redisClient.multi()
            .srem(key, socketId) // Remove the socket
            .scard(key) // Check size after removal
            .exec();
            
        const remainingCount = results[1][1];
        return remainingCount === 0;
    }

    /**
     * Checks if a user is currently online.
     * @returns {Promise<boolean>}
     */
    async isOnline(userId) {
        if (redisClient.status !== "ready") return false;
        const count = await redisClient.scard(this.getPrefix(userId));
        return count > 0;
    }

    /**
     * Retrieves the presence status for a specific user.
     */
    async getUserPresence(userId) {
        return {
            userId,
            status: await this.isOnline(userId) ? "online" : "offline"
        };
    }

    /**
     * Retrieves the presence status for an array of users.
     */
    async getUsersPresence(userIds) {
        const promises = userIds.map(userId => this.getUserPresence(userId));
        return Promise.all(promises);
    }

    /**
     * Returns the active socket IDs for a user.
     */
    async getActiveSockets(userId) {
        if (redisClient.status !== "ready") return [];
        return await redisClient.smembers(this.getPrefix(userId));
    }
}

export const presenceService = new PresenceService();
