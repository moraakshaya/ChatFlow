import EVENTS from "../events.js";
import { verifyConversationAccess } from "./room.handler.js";

// In-memory state: Map<conversationId, Map<userId, NodeJS.Timeout>>
const typingTimers = new Map();

// Helper to broadcast stop typing and cleanup memory
const stopTyping = (io, conversationId, userId) => {
    console.log(`[Typing Handler] Broadcasting typing_stop for user ${userId} in ${conversationId}`);
    // 1. Broadcast the stop event to everyone else in the room
    const roomName = `conversation_${conversationId}`;
    io.to(roomName).emit(EVENTS.TYPING_STOP, {
        conversationId,
        userId
    });

    // 2. Clear from memory
    const convTimers = typingTimers.get(conversationId);
    if (convTimers) {
        if (convTimers.has(userId)) {
            clearTimeout(convTimers.get(userId));
            convTimers.delete(userId);
        }
        if (convTimers.size === 0) {
            typingTimers.delete(conversationId);
        }
    }
};

export const registerTypingHandlers = (io, socket) => {
    const userId = socket.user._id.toString();

    socket.on(EVENTS.TYPING_START, async (payload, callback) => {
        const { conversationId } = payload;
        if (!conversationId) return;

        // Security check
        const isAuthorized = await verifyConversationAccess(conversationId, userId);
        if (!isAuthorized) {
            if (typeof callback === "function") {
                callback({ success: false, message: "Unauthorized" });
            }
            return;
        }

        // Acknowledge request
        if (typeof callback === "function") {
            callback({ success: true });
        }

        // Broadcast to other room members
        const roomName = `conversation_${conversationId}`;
        socket.to(roomName).emit(EVENTS.TYPING_START, {
            conversationId,
            userId
        });

        // Set or reset server timeout (5 seconds)
        if (!typingTimers.has(conversationId)) {
            typingTimers.set(conversationId, new Map());
        }
        const convTimers = typingTimers.get(conversationId);

        if (convTimers.has(userId)) {
            clearTimeout(convTimers.get(userId));
        }

        const timer = setTimeout(() => {
            // Autonomous server timeout cleanup
            stopTyping(io, conversationId, userId);
        }, 5000);

        convTimers.set(userId, timer);
    });

    socket.on(EVENTS.TYPING_STOP, async (payload, callback) => {
        const { conversationId } = payload;
        if (!conversationId) return;

        const isAuthorized = await verifyConversationAccess(conversationId, userId);
        if (!isAuthorized) {
            if (typeof callback === "function") {
                callback({ success: false, message: "Unauthorized" });
            }
            return;
        }

        if (typeof callback === "function") {
            callback({ success: true });
        }

        stopTyping(io, conversationId, userId);
    });
};

export const handleTypingDisconnect = (io, socket) => {
    const userId = socket.user._id.toString();

    // Iterate over all active typing states and remove this user
    for (const [conversationId, convTimers] of typingTimers.entries()) {
        if (convTimers.has(userId)) {
            stopTyping(io, conversationId, userId);
        }
    }
};
