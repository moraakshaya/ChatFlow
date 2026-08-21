import mongoose from "mongoose";
import Message from "../models/Message.js";
import MessageReaction from "../models/MessageReaction.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import realtimeService from "./realtime.service.js";
import { notificationService } from "./notification.service.js";
import { unreadService } from "./unread.service.js";
import { webhookEventService } from "./webhookEvent.service.js";
import logger from "../utils/logger.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

class MessageService {
    async sendMessage(data) {
        const { conversationId, senderId, clientMessageId, type, content, attachments, replyTo, metadata } = data;

        const messagePayload = {
            conversationId,
            senderId,
            clientMessageId,
            type,
            content: type === "text" ? content : undefined,
            attachments: type === "attachment" ? attachments : undefined,
            replyTo,
            metadata
        };

        let message;
        try {
            message = await Message.create(messagePayload);
            // Populate the senderId so we have the full user details
            message = await Message.findById(message._id).populate("senderId", "fullName email avatar status");
        } catch (error) {
            if (error.code === 11000) {
                return await Message.findOne({ senderId, clientMessageId }).populate("senderId", "fullName email avatar status");
            }
            throw error;
        }

        const conversation = await Conversation.findOneAndUpdate(
            { 
                _id: conversationId,
                $or: [
                    { lastMessageAt: { $lt: message.createdAt } },
                    { lastMessageAt: null }
                ]
            },
            { 
                lastMessageId: message._id, 
                lastMessageAt: message.createdAt 
            },
            { new: true }
        );

        if (conversation && conversation.projectId) {
            webhookEventService.dispatchEvent("message.created", "v1", conversation.projectId, {
                messageId: message._id,
                conversationId: conversationId
            });
        }

        const plainMessage = message.toJSON();
        realtimeService.emitNewMessage(conversationId, plainMessage);

        ConversationMember.find({
            conversationId,
            status: "active",
            userId: { $ne: senderId }
        }).then(members => {
            members.forEach(member => {
                unreadService.emitUnreadUpdate(conversationId, member.userId).catch(err => 
                    logger.error({ event: "unread.broadcast.error", error: err.message }, "Failed to emit unread update")
                );

                notificationService.createNotification({
                    recipient: member.userId,
                    type: "MESSAGE",
                    title: "New Message",
                    message: "You have a new message",
                    conversation: conversationId,
                    sourceMessage: message._id,
                    actor: senderId
                }).catch(err => logger.error({ event: "message.notification.error", error: err.message }, "Failed to create message notification"));
            });
        }).catch(err => logger.error({ event: "message.notification.members.error", error: err.message }, "Failed to fetch members"));

        return message;
    }

    async getMessages(conversationId, queryParams = {}) {
        const limit = parseInt(queryParams.limit, 10) || 50;
        const actualLimit = limit > 100 ? 100 : limit;
        const { cursor } = queryParams;

        const query = { conversationId };

        if (cursor) {
            try {
                const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
                const [cursorCreatedAtStr, cursorIdStr] = decodedCursor.split("|");
                
                const cursorCreatedAt = new Date(parseInt(cursorCreatedAtStr, 10));
                const cursorId = mongoose.Types.ObjectId.createFromHexString(cursorIdStr);

                query.$or = [
                    { createdAt: { $lt: cursorCreatedAt } },
                    { createdAt: cursorCreatedAt, _id: { $lt: cursorId } }
                ];
            } catch (e) {
                throw new AppError("Invalid cursor", 400, ERROR_CODES.VALIDATION_ERROR);
            }
        }

        const messages = await Message.find(query)
            .sort({ createdAt: -1, _id: -1 })
            .limit(actualLimit + 1)
            .populate("senderId", "fullName email avatar status")
            .lean();

        let nextCursor = null;

        if (messages.length > actualLimit) {
            const nextMessage = messages[actualLimit - 1];
            const nextCursorStr = `${nextMessage.createdAt.getTime()}|${nextMessage._id.toString()}`;
            nextCursor = Buffer.from(nextCursorStr).toString("base64");
            messages.pop();
        }

        const sanitizedMessages = messages.map(msg => {
            if (msg.isDeleted) {
                return {
                    ...msg,
                    content: undefined,
                    attachments: undefined,
                };
            }
            return msg;
        });

        const messageIds = sanitizedMessages.map(m => m._id);
        const reactions = await MessageReaction.find({ messageId: { $in: messageIds } }).lean();

        // Group reactions by messageId
        const reactionsByMessageId = reactions.reduce((acc, reaction) => {
            const mId = reaction.messageId.toString();
            if (!acc[mId]) acc[mId] = [];
            acc[mId].push(reaction);
            return acc;
        }, {});

        // Attach reactions
        const messagesWithReactions = sanitizedMessages.map(msg => ({
            ...msg,
            reactions: reactionsByMessageId[msg._id.toString()] || []
        }));

        return {
            messages: messagesWithReactions,
            pagination: {
                limit: actualLimit,
                nextCursor,
                hasMore: nextCursor !== null
            }
        };
    }

    async deleteMessage(messageId, userId) {
        const message = await Message.findById(messageId);

        if (!message) {
            throw new AppError("Message not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        if (message.senderId.toString() !== userId.toString()) {
            throw new AppError("You can only delete your own messages", 403, ERROR_CODES.FORBIDDEN);
        }

        if (message.isDeleted) {
            return message;
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.content = undefined;
        message.attachments = undefined;

        await message.save();

        // Delete all reactions associated with this message
        await MessageReaction.deleteMany({ messageId });

        const conversation = await Conversation.findOne({ _id: message.conversationId, lastMessageId: message._id });
        
        if (conversation) {
            const previousMessage = await Message.findOne({
                conversationId: message.conversationId,
                isDeleted: false
            }).sort({ createdAt: -1, _id: -1 });

            if (previousMessage) {
                conversation.lastMessageId = previousMessage._id;
                conversation.lastMessageAt = previousMessage.createdAt;
            } else {
                conversation.lastMessageId = null;
                conversation.lastMessageAt = null;
            }
            await conversation.save();
        }

        // Fetch conversation to get projectId if we didn't just get it
        const conv = conversation || await Conversation.findById(message.conversationId);
        if (conv && conv.projectId) {
            webhookEventService.dispatchEvent("message.deleted", "v1", conv.projectId, {
                messageId: message._id,
                conversationId: message.conversationId
            });
        }

        realtimeService.emitMessageDeleted(message.conversationId, message._id);

        ConversationMember.find({
            conversationId: message.conversationId,
            status: "active",
            userId: { $ne: userId }
        }).then(members => {
            members.forEach(member => {
                unreadService.emitUnreadUpdate(message.conversationId, member.userId).catch(err => 
                    logger.error({ event: "unread.broadcast.error", error: err.message }, "Failed to emit unread update on delete")
                );
            });
        }).catch(err => logger.error({ event: "message.delete.members.error", error: err.message }, "Failed to fetch members for unread update"));

        return message;
    }
}

export const messageService = new MessageService();
