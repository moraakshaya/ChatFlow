import { getIo } from "../socket/index.js";
import EVENTS from "../socket/events.js";

class RealtimeService {
    /**
     * Broadcasts a new message to all connected and authorized members of a conversation.
     * @param {String} conversationId 
     * @param {Object} message The canonical message object from the database
     */
    emitNewMessage(conversationId, message) {
        try {
            const io = getIo();
            const roomName = `conversation_${conversationId}`;
            io.to(roomName).emit(EVENTS.NEW_MESSAGE, { message });
        } catch (error) {
            console.error("Failed to emit new message event:", error.message);
            // We log the error but don't throw, as REST should still succeed
            // if real-time delivery temporarily fails.
        }
    }

    // Future methods will go here (e.g., emitTypingStart, emitMessageRead, etc.)
}

export default new RealtimeService();
