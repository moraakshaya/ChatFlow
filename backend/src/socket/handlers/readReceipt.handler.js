import EVENTS from "../events.js";
import { readReceiptService } from "../../services/readReceipt.service.js";
import { validateSocketPayload } from "../middleware/validate.socket.js";
import { validateSocketRateLimit } from "../middleware/rateLimit.socket.js";
import AppError from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
import { handleSocketError } from "../middleware/error.socket.js";

/**
 * Registers real-time read receipt handlers for the socket.
 */
export const registerReadReceiptHandlers = (io, socket) => {
    const userId = socket.user._id.toString();

    socket.on(EVENTS.READ_MESSAGE, async (payload, callback) => {
        try {
            if (!validateSocketRateLimit(socket, "MESSAGE_READ")) return;

            if (!validateSocketPayload(socket, payload, {
                conversationId: { required: true, type: "objectId" },
                messageId: { required: true, type: "objectId" }
            })) return;

            const { conversationId, messageId } = payload;

            // 1. Verify user membership in this conversation
            const isMember = await readReceiptService.verifyActiveMembership(conversationId, userId);
            if (!isMember) {
                handleSocketError(socket, new AppError("You do not have access to this conversation", 403, ERROR_CODES.FORBIDDEN), callback);
                return;
            }

            // 2. Mark message as read using the shared service logic
            const result = await readReceiptService.markSingleMessageAsRead(conversationId, messageId, userId);

            if (!result.success) {
                // Determine appropriate code based on result message (naive mapping)
                const code = result.message.includes("not found") ? ERROR_CODES.RESOURCE_NOT_FOUND : ERROR_CODES.BAD_REQUEST;
                handleSocketError(socket, new AppError(result.message, 400, code), callback);
                return;
            }

            // 3. Acknowledge successfully with the readAt timestamp
            if (typeof callback === "function") {
                callback({
                    success: true,
                    messageId,
                    readAt: result.readAt
                });
            }

            // 4. If it's a first-time read, broadcast message:read to the rest of the conversation
            if (result.isNew) {
                socket.to(`conversation_${conversationId}`).emit(EVENTS.MESSAGE_READ, {
                    conversationId,
                    messageId,
                    userId,
                    readAt: result.readAt
                });
            }

        } catch (err) {
            handleSocketError(socket, err, callback);
        }
    });
};
