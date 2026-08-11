import ConversationMember from "../../models/ConversationMember.js";
import EVENTS from "../events.js";
import mongoose from "mongoose";

/**
 * Validates if the user is an active member of the requested conversation.
 */
export const verifyConversationAccess = async (conversationId, userId) => {
    try {
        const membership = await ConversationMember.findOne({
            conversationId: mongoose.Types.ObjectId.createFromHexString(conversationId),
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            status: "active"
        });
        return !!membership;
    } catch (error) {
        return false;
    }
};

/**
 * Handles room joining and leaving for secure Socket.IO communication.
 */
export const registerRoomHandlers = (io, socket) => {
    const userId = socket.user._id.toString();

    // Client requests to join a conversation room
    socket.on(EVENTS.JOIN_CONVERSATION, async ({ conversationId }) => {
        if (!conversationId) return;

        const isAuthorized = await verifyConversationAccess(conversationId, userId);

        if (isAuthorized) {
            const roomName = `conversation_${conversationId}`;
            socket.join(roomName);
            // Optionally notify others in the room
            // io.to(roomName).emit('user_joined_room', { userId });
        } else {
            // Emitting an error back to the specific socket
            socket.emit(EVENTS.ERROR, {
                message: "Unauthorized to join conversation",
                code: "FORBIDDEN"
            });
        }
    });

    // Client requests to leave a conversation room
    socket.on(EVENTS.LEAVE_CONVERSATION, ({ conversationId }) => {
        if (!conversationId) return;
        const roomName = `conversation_${conversationId}`;
        socket.leave(roomName);
    });
};
