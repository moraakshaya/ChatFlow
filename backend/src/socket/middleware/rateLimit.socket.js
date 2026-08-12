import { RATE_LIMIT_CONFIG } from "../../config/rateLimit.config.js";
import EVENTS from "../events.js";

// In-memory store: Map<eventId, Map<userId, { count: number, resetAt: number }>>
const socketRateLimits = new Map();

/**
 * Validates whether a socket event exceeds the rate limit.
 * Emits an error back to the socket if exceeded.
 * 
 * @param {Object} socket - The Socket.IO socket instance
 * @param {string} eventCategory - The rate limit config category (e.g., 'MESSAGE_SEND')
 * @returns {boolean} true if allowed, false if rate limited
 */
export const validateSocketRateLimit = (socket, eventCategory) => {
    const config = RATE_LIMIT_CONFIG.SOCKET[eventCategory];
    if (!config) return true; // No limit configured for this event

    const userId = socket.user ? socket.user._id.toString() : socket.id;

    if (!socketRateLimits.has(eventCategory)) {
        socketRateLimits.set(eventCategory, new Map());
    }

    const eventLimits = socketRateLimits.get(eventCategory);
    const now = Date.now();

    let userLimit = eventLimits.get(userId);

    // If no record or window expired, reset
    if (!userLimit || now > userLimit.resetAt) {
        userLimit = {
            count: 1,
            resetAt: now + config.windowMs
        };
        eventLimits.set(userId, userLimit);
        return true;
    }

    // Increment count
    userLimit.count += 1;
    
    if (userLimit.count > config.max) {
        socket.emit(EVENTS.ERROR, {
            code: "RATE_LIMIT_EXCEEDED",
            message: `Too many requests for event category ${eventCategory}. Please try again later.`,
            retryAfter: Math.ceil((userLimit.resetAt - now) / 1000)
        });
        return false;
    }

    return true;
};
