import ReadReceipt from "../models/ReadReceipt.js";
import Message from "../models/Message.js";
import ConversationMember from "../models/ConversationMember.js";
import logger from "../utils/logger.js";

class ReadReceiptService {
    /**
     * Helper to verify if user is an active member of the conversation.
     */
    async verifyActiveMembership(conversationId, userId) {
        const { authorizationService } = await import("./authorization.service.js");
        return await authorizationService.checkConversationMembership(userId, conversationId);
    }

    /**
     * Process marking an array of messages as read.
     * Returns the number of successfully updated receipts.
     */
    async markMultipleMessagesAsRead(conversationId, messageIds, userId) {
        const messages = await Message.find({
            _id: { $in: messageIds },
            conversationId,
            isDeleted: false
        });

        if (messages.length !== messageIds.length) {
            throw new Error("One or more messages are invalid, deleted, or belong to a different conversation");
        }

        // Filter out messages where the authenticated user is the sender
        const validMessageIdsToUpdate = messages
            .filter(msg => msg.senderId.toString() !== userId.toString())
            .map(msg => msg._id);

        if (validMessageIdsToUpdate.length === 0) {
            return 0; // Nothing to update
        }

        const now = new Date();

        const bulkOps = validMessageIdsToUpdate.map(msgId => ({
            updateOne: {
                filter: { messageId: msgId, userId },
                update: {
                    $set: {
                        conversationId,
                        status: "read",
                        readAt: now
                    },
                    // Only set deliveredAt if it doesn't already exist (respecting time progression)
                    $setOnInsert: {
                        deliveredAt: now
                    }
                },
                upsert: true
            }
        }));

        await ReadReceipt.bulkWrite(bulkOps);

        return validMessageIdsToUpdate.length;
    }

    /**
     * Process marking a single message as read.
     * Returns an object indicating success and idempotency status.
     * @returns { success: boolean, isNew: boolean, readAt: Date, message?: string }
     */
    async markSingleMessageAsRead(conversationId, messageId, userId) {
        try {
            // 1. Check if receipt already exists
            const existingReceipt = await ReadReceipt.findOne({
                messageId,
                userId
            });

            if (existingReceipt && existingReceipt.status === "read") {
                // Repeated read: idempotent return
                return {
                    success: true,
                    isNew: false,
                    readAt: existingReceipt.readAt
                };
            }

            // 2. Validate message exists and belongs to conversation
            const message = await Message.findOne({
                _id: messageId,
                conversationId,
                isDeleted: false
            });

            if (!message) {
                return {
                    success: false,
                    message: "Message not found or deleted"
                };
            }

            if (message.senderId.toString() === userId.toString()) {
                return {
                    success: false,
                    message: "You cannot mark your own message as read"
                };
            }

            // 3. Upsert read receipt
            const now = new Date();
            const result = await ReadReceipt.findOneAndUpdate(
                { messageId, userId },
                {
                    $set: {
                        conversationId,
                        status: "read",
                        readAt: now
                    },
                    $setOnInsert: {
                        deliveredAt: now
                    }
                },
                { upsert: true, new: true }
            );

            return {
                success: true,
                isNew: true,
                readAt: result.readAt
            };

        } catch (error) {
            logger.error({ event: "read_receipt.error", error: error.message }, "Error in markSingleMessageAsRead");
            return {
                success: false,
                message: "Internal server error"
            };
        }
    }
}

export const readReceiptService = new ReadReceiptService();
