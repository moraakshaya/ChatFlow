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
            
            logger.debug(`Broadcasted new message to room ${roomName}`);
        } catch (error) {
            logger.error({ event: "realtime.message.error", error: error.message }, "Failed to emit new message event");
            // We log the error but don't throw, as REST should still succeed
            // if real-time delivery temporarily fails.
        }
    }

    /**
     * Broadcasts a message update.
     */
    emitMessageUpdated(conversationId, message) {
        try {
            const io = getIo();
            const roomName = `conversation_${conversationId}`;
            io.to(roomName).emit(EVENTS.MESSAGE_UPDATED, { message });
            logger.debug(`Broadcasted message update to room ${roomName}`);
        } catch (error) {
            logger.error({ event: "realtime.message_update.error", error: error.message }, "Failed to emit message update event");
        }
    }

    /**
     * Broadcasts a message deletion.
     */
    emitMessageDeleted(conversationId, messageId) {
        try {
            const io = getIo();
            const roomName = `conversation_${conversationId}`;
            io.to(roomName).emit(EVENTS.MESSAGE_DELETED, { messageId, conversationId });
            logger.debug(`Broadcasted message deletion to room ${roomName}`);
        } catch (error) {
            logger.error({ event: "realtime.message_delete.error", error: error.message }, "Failed to emit message delete event");
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

    /**
     * Broadcasts a conversation metadata update (name, description, topic, etc.)
     * to all members currently in the conversation room.
     * @param {String} conversationId
     * @param {Object} conversation The updated conversation document (plain object)
     */
    emitConversationUpdated(conversationId, conversation) {
        try {
            const io = getIo();
            const roomName = `conversation_${conversationId}`;
            io.to(roomName).emit(EVENTS.CONVERSATION_UPDATED, { conversation });
            logger.debug(`Broadcasted conversation update to room ${roomName}`);
        } catch (error) {
            logger.error({ event: "realtime.conversation_update.error", error: error.message }, "Failed to emit conversation updated event");
        }
    }

    /**
     * Broadcasts that a conversation has been archived.
     * All members' sidebars should move it to the "Archived" section.
     * @param {String} conversationId
     */
    emitConversationArchived(conversationId) {
        try {
            const io = getIo();
            const roomName = `conversation_${conversationId}`;
            io.to(roomName).emit(EVENTS.CONVERSATION_ARCHIVED, { conversationId });
            logger.debug(`Broadcasted conversation archived to room ${roomName}`);
        } catch (error) {
            logger.error({ event: "realtime.conversation_archive.error", error: error.message }, "Failed to emit conversation archived event");
        }
    }

    /**
     * Broadcasts that a conversation has been permanently deleted.
     * All members should remove it from their sidebar and navigate away.
     * @param {String} conversationId
     */
    emitConversationDeleted(conversationId) {
        try {
            const io = getIo();
            const roomName = `conversation_${conversationId}`;
            io.to(roomName).emit(EVENTS.CONVERSATION_DELETED, { conversationId });
            logger.debug(`Broadcasted conversation deleted to room ${roomName}`);
        } catch (error) {
            logger.error({ event: "realtime.conversation_delete.error", error: error.message }, "Failed to emit conversation deleted event");
        }
    }
}

export default new RealtimeService();
