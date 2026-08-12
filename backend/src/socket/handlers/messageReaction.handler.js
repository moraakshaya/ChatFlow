import EVENTS from "../events.js";
import { messageReactionService } from "../../services/messageReaction.service.js";
import { validateSocketPayload } from "../middleware/validate.socket.js";
import { validateSocketRateLimit } from "../middleware/rateLimit.socket.js";
import AppError from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
import { handleSocketError } from "../middleware/error.socket.js";

/**
 * Registers real-time message reaction handlers for the socket.
 */
export const registerMessageReactionHandlers = (io, socket) => {
    const userId = socket.user._id.toString();

    // Handle adding a reaction
    socket.on(EVENTS.REACTION_ADD, async (payload, callback) => {
        try {
            if (!validateSocketRateLimit(socket, "MESSAGE_REACTION")) return;

            if (!validateSocketPayload(socket, payload, {
                conversationId: { required: true, type: "objectId" },
                messageId: { required: true, type: "objectId" },
                reaction: { required: true, type: "string", maxLength: 10 }
            })) return;

            const { conversationId, messageId, reaction } = payload;

            const result = await messageReactionService.addReaction(messageId, userId, reaction);

            if (result.error) {
                // Determine appropriate code (e.g. 404 vs 403) based on result.error.status
                const code = result.error.status === 404 ? ERROR_CODES.RESOURCE_NOT_FOUND :
                             result.error.status === 403 ? ERROR_CODES.FORBIDDEN :
                             result.error.status === 409 ? ERROR_CODES.DUPLICATE_RESOURCE :
                             ERROR_CODES.BAD_REQUEST;
                
                handleSocketError(socket, new AppError(result.error.message, result.error.status || 400, code), callback);
                return;
            }

            if (typeof callback === "function") {
                callback({ success: true });
            }

            // Broadcast to the conversation room (excluding the sender)
            socket.to(`conversation_${conversationId}`).emit(EVENTS.REACTION_ADDED, {
                conversationId,
                messageId,
                userId,
                reaction,
                createdAt: result.data.createdAt || new Date()
            });

        } catch (err) {
            handleSocketError(socket, err, callback);
        }
    });

    // Handle removing a reaction
    socket.on(EVENTS.REACTION_REMOVE, async (payload, callback) => {
        try {
            if (!validateSocketRateLimit(socket, "MESSAGE_REACTION")) return;

            if (!validateSocketPayload(socket, payload, {
                conversationId: { required: true, type: "objectId" },
                messageId: { required: true, type: "objectId" },
                reaction: { required: true, type: "string", maxLength: 10 }
            })) return;

            const { conversationId, messageId, reaction } = payload;

            const result = await messageReactionService.removeReaction(messageId, userId, reaction);

            if (result.error) {
                const code = result.error.status === 404 ? ERROR_CODES.RESOURCE_NOT_FOUND :
                             result.error.status === 403 ? ERROR_CODES.FORBIDDEN :
                             ERROR_CODES.BAD_REQUEST;
                handleSocketError(socket, new AppError(result.error.message, result.error.status || 400, code), callback);
                return;
            }

            if (typeof callback === "function") {
                callback({ success: true });
            }

            // Broadcast to the conversation room (excluding the sender)
            socket.to(`conversation_${conversationId}`).emit(EVENTS.REACTION_REMOVED, {
                conversationId,
                messageId,
                userId,
                reaction
            });

        } catch (err) {
            handleSocketError(socket, err, callback);
        }
    });
};
