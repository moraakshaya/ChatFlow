import mongoose from "mongoose";
import logger from "../utils/logger.js";
import Message from "../models/Message.js";
import ConversationMember from "../models/ConversationMember.js";
import { getIo } from "../socket/index.js";
import EVENTS from "../socket/events.js";

class UnreadService {
    /**
     * Calculates the unread count for a specific user in a specific conversation.
     * @param {String} conversationId 
     * @param {String} userId 
     * @returns {Promise<Number>}
     */
    async calculateUnreadCount(conversationId, userId) {
        // Get the user's membership to find their lastReadMessageId
        const membership = await ConversationMember.findOne({
            conversationId,
            userId,
            status: "active"
        });

        if (!membership) return 0; // If not a member, no unread count

        const query = {
            conversationId,
            senderId: { $ne: userId }, // Exclude user's own messages
            isDeleted: false // Exclude deleted messages
        };

        if (membership.lastReadMessageId) {
            // Find the referenced message to get its creation time
            const lastReadMessage = await Message.findById(membership.lastReadMessageId);
            if (lastReadMessage) {
                // Find messages strictly after the last read message based on createdAt + _id deterministic ordering
                query.$or = [
                    { createdAt: { $gt: lastReadMessage.createdAt } },
                    { createdAt: lastReadMessage.createdAt, _id: { $gt: lastReadMessage._id } }
                ];
            }
        }
        
        // If lastReadMessageId is null or the referenced message isn't found (hard deleted edge case),
        // it falls through and counts from the beginning of the conversation.

        return Message.countDocuments(query);
    }

    /**
     * Gets unread counts for all conversations the user is a part of.
     * @param {String} userId 
     * @returns {Promise<Array>} Array of { conversationId, unreadCount }
     */
    async getAllUnreadCounts(userId) {
        const memberships = await ConversationMember.find({
            userId,
            status: "active"
        });

        const counts = await Promise.all(
            memberships.map(async (membership) => {
                const count = await this.calculateUnreadCount(membership.conversationId, userId);
                return {
                    conversationId: membership.conversationId,
                    unreadCount: count
                };
            })
        );

        return counts;
    }

    /**
     * Gets the total unread count across all conversations.
     * @param {String} userId 
     * @returns {Promise<Number>}
     */
    async getTotalUnreadCount(userId) {
        const counts = await this.getAllUnreadCounts(userId);
        return counts.reduce((acc, curr) => acc + curr.unreadCount, 0);
    }

    /**
     * Emits the unread update to the user's specific socket room.
     * @param {String} conversationId 
     * @param {String} userId 
     */
    async emitUnreadUpdate(conversationId, userId) {
        try {
            const unreadCount = await this.calculateUnreadCount(conversationId, userId);
            const totalUnread = await this.getTotalUnreadCount(userId);

            const io = getIo();
            io.to(`user_${userId}`).emit(EVENTS.UNREAD_UPDATE, {
                conversationId,
                unreadCount,
                totalUnread
            });
        } catch (error) {
            logger.error({ event: "unread.broadcast.error", error: error.message }, "Failed to emit unread update");
        }
    }

    /**
     * Marks a conversation as read by updating the lastReadMessageId to the latest message.
     * @param {String} conversationId 
     * @param {String} userId 
     */
    async markConversationAsRead(conversationId, userId) {
        // Verify membership
        const membership = await ConversationMember.findOne({
            conversationId,
            userId,
            status: "active"
        });

        if (!membership) {
            throw new Error("Access denied: Not an active member");
        }

        // Find the latest message in the conversation
        const latestMessage = await Message.findOne({ conversationId }).sort({ createdAt: -1, _id: -1 });

        if (latestMessage) {
            membership.lastReadMessageId = latestMessage._id;
            membership.lastReadAt = new Date();
            await membership.save();
        }

        // Also mark all in-app notifications for this conversation as read
        await mongoose.model("Notification").updateMany(
            { recipient: userId, conversation: conversationId, isRead: false },
            { $set: { isRead: true } }
        );

        // Emit real-time update indicating unread count is now 0 (and total unread is updated)
        await this.emitUnreadUpdate(conversationId, userId);

        return {
            conversationId,
            unreadCount: 0
        };
    }
}

export const unreadService = new UnreadService();
