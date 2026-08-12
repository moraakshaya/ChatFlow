/**
 * Rate limit configuration for different endpoints and socket events.
 * Defines the window size and maximum number of allowed requests.
 */

export const RATE_LIMIT_CONFIG = {
    REST: {
        AUTH: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 10, // Limit each IP to 10 requests per windowMs
            message: "Too many authentication attempts, please try again after 15 minutes."
        },
        API_KEY: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 100, // Limit each API key to 100 requests per minute
            message: "Too many requests using this API Key. Please slow down."
        },
        GENERAL_API: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 100, // Limit each IP/User to 100 requests per windowMs
            message: "Too many requests. Please try again later."
        },
        MESSAGE: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 30, // Limit each User to 30 messages per minute
            message: "Too many messages sent. Please slow down."
        },
        SEARCH: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 20, // Limit each User to 20 searches per minute
            message: "Too many search requests. Please slow down."
        },
        SENSITIVE: {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 5, // Limit each IP/User to 5 requests per windowMs
            message: "Too many sensitive operations. Please try again later."
        }
    },
    SOCKET: {
        MESSAGE_SEND: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 30
        },
        MESSAGE_REACTION: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 60
        },
        MESSAGE_READ: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 100
        },
        CONVERSATION_JOIN: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 30
        },
        TYPING: {
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 200 // Lightweight event, high limit
        }
    }
};
