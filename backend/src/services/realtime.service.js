import { getIo } from "../socket/index.js";
import logger from "../utils/logger.js";
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
            logger.error({ event: "realtime.message.error", error: error.message }, "Failed to emit new message event");
            // We log the error but don't throw, as REST should still succeed
            // if real-time delivery temporarily fails.
        }
    }

    /**
     * Emits a new notification directly to the user's personal room.
     * @param {String} userId 
     * @param {Object} notification 
     */
    emitNewNotification(userId, notification) {
        try {
            const io = getIo();
            const roomName = `user_${userId}`;
            io.to(roomName).emit(EVENTS.NOTIFICATION_NEW, notification);
        } catch (error) {
            logger.error({ event: "realtime.notification.error", error: error.message }, "Failed to emit new notification event");
        }
    }
}

export default new RealtimeService();
