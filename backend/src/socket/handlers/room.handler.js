import ConversationMember from "../../models/ConversationMember.js";
import EVENTS from "../events.js";
import mongoose from "mongoose";
import { validateSocketPayload } from "../middleware/validate.socket.js";
import { validateSocketRateLimit } from "../middleware/rateLimit.socket.js";
import AppError from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
import { handleSocketError } from "../middleware/error.socket.js";

/**
 * Validates if the user is an active member of the requested conversation.
 */
export const verifyConversationAccess = async (conversationId, userId) => {
    try {
        const { authorizationService } = await import("../../services/authorization.service.js");
        return await authorizationService.checkConversationMembership(userId, conversationId);
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
    socket.on(EVENTS.JOIN_CONVERSATION, async (payload) => {
        if (!validateSocketRateLimit(socket, "CONVERSATION_JOIN")) return;
        
        if (!validateSocketPayload(socket, payload, {
            conversationId: { required: true, type: "objectId" }
        })) return;

        const { conversationId } = payload;
        const isAuthorized = await verifyConversationAccess(conversationId, userId);

        if (isAuthorized) {
            const roomName = `conversation_${conversationId}`;
            socket.join(roomName);
        } else {
            // Emitting an error back to the specific socket
            handleSocketError(socket, new AppError("Unauthorized to join conversation", 403, ERROR_CODES.FORBIDDEN));
        }
    });

    // Client requests to leave a conversation room
    socket.on(EVENTS.LEAVE_CONVERSATION, (payload) => {
        if (!validateSocketPayload(socket, payload, {
            conversationId: { required: true, type: "objectId" }
        })) return;

        const { conversationId } = payload;
        const roomName = `conversation_${conversationId}`;
        socket.leave(roomName);
    });
};
