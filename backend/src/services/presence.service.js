/**
 * In-memory Presence Service
 * Manages active Socket.IO connections per user and determines online/offline status.
 */

class PresenceService {
    constructor() {
        // Map<userId, Set<socketId>>
        this.activeSockets = new Map();
    }

    /**
     * Registers a new socket connection for a user.
     * @returns {boolean} true if the user transitioned from offline to online (0 -> 1 socket).
     */
    registerSocket(userId, socketId) {
        let isNewOnline = false;

        if (!this.activeSockets.has(userId)) {
            this.activeSockets.set(userId, new Set());
            isNewOnline = true; // Was 0, now transitioning to > 0
        }

        const userSockets = this.activeSockets.get(userId);
        userSockets.add(socketId);

        return isNewOnline;
    }

    /**
     * Removes a socket connection for a user.
     * @returns {boolean} true if the user transitioned from online to offline (1 -> 0 sockets).
     */
    removeSocket(userId, socketId) {
        if (!this.activeSockets.has(userId)) {
            return false;
        }

        const userSockets = this.activeSockets.get(userId);
        userSockets.delete(socketId);

        if (userSockets.size === 0) {
            this.activeSockets.delete(userId);
            return true; // Transitioned to 0 sockets
        }

        return false;
    }

    /**
     * Checks if a user is currently online.
     */
    isOnline(userId) {
        return this.activeSockets.has(userId) && this.activeSockets.get(userId).size > 0;
    }

    /**
     * Retrieves the presence status for a specific user.
     */
    getUserPresence(userId) {
        return {
            userId,
            status: this.isOnline(userId) ? "online" : "offline"
        };
    }

    /**
     * Retrieves the presence status for an array of users.
     */
    getUsersPresence(userIds) {
        return userIds.map(userId => this.getUserPresence(userId));
    }

    /**
     * Returns the active socket IDs for a user.
     */
    getActiveSockets(userId) {
        if (!this.activeSockets.has(userId)) return [];
        return Array.from(this.activeSockets.get(userId));
    }
}

export const presenceService = new PresenceService();
