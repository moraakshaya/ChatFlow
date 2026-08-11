import EVENTS from "../events.js";
import { readReceiptService } from "../../services/readReceipt.service.js";

/**
 * Registers real-time read receipt handlers for the socket.
 */
export const registerReadReceiptHandlers = (io, socket) => {
    const userId = socket.user._id.toString();

    socket.on(EVENTS.READ_MESSAGE, async (payload, callback) => {
        try {
            const { conversationId, messageId } = payload;

            if (!conversationId || !messageId) {
                if (typeof callback === "function") {
                    callback({ success: false, message: "conversationId and messageId are required" });
                }
                return;
            }

            // 1. Verify user membership in this conversation
            const isMember = await readReceiptService.verifyActiveMembership(conversationId, userId);
            if (!isMember) {
                if (typeof callback === "function") {
                    callback({ success: false, message: "You do not have access to this conversation" });
                }
                return;
            }

            // 2. Mark message as read using the shared service logic
            const result = await readReceiptService.markSingleMessageAsRead(conversationId, messageId, userId);

            if (!result.success) {
                if (typeof callback === "function") {
                    callback({ success: false, message: result.message });
                }
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
            console.error("Error handling read:message", err);
            if (typeof callback === "function") {
                callback({ success: false, message: "Internal server error" });
            }
        }
    });
};
