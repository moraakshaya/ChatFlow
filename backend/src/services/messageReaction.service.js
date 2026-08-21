import MessageReaction from "../models/MessageReaction.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import { notificationService } from "./notification.service.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import logger from "../utils/logger.js";

class MessageReactionService {
    /**
     * Validates preconditions for adding or removing a reaction.
     * Returns the message, conversation, and membership if valid.
     */
    async validateReactionPreconditions(messageId, userId) {
        const message = await Message.findById(messageId);
        if (!message) {
            return { error: { status: 404, message: "Message not found" } };
        }

        if (message.isDeleted) {
            return { error: { status: 400, message: "Cannot react to a deleted message" } };
        }

        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation) {
            return { error: { status: 404, message: "Conversation not found" } };
        }

        const { authorizationService } = await import("./authorization.service.js");
        const hasAccess = await authorizationService.checkConversationMembership(userId, message.conversationId);

        if (!hasAccess) {
            return { error: { status: 403, message: "You are not an active member of this conversation" } };
        }

        return { message, conversation };
    }

    /**
     * Adds or updates a reaction to a message.
     */
    async addReaction(messageId, userId, reaction) {
        if (!reaction) {
            return { error: { status: 400, message: "Reaction is required" } };
        }

        const { error, message, conversation } = await this.validateReactionPreconditions(messageId, userId);
        if (error) return { error };

        const allowedReactions = ["❤️", "👍", "😂", "🔥", "🎉", "😢", "😡", "👏"];
        if (!allowedReactions.includes(reaction)) {
            return { error: { status: 400, message: "Invalid reaction" } };
        }

        try {
            const updatedReaction = await MessageReaction.findOneAndUpdate(
                { messageId, userId, reaction },
                {
                    organizationId: conversation.organizationId,
                    projectId: conversation.projectId,
                    workspaceId: conversation.workspaceId,
                    conversationId: conversation._id,
                    reaction
                },
                { new: true, upsert: true, runValidators: true }
            );

            // Generate Notification for the message owner
            if (message.senderId.toString() !== userId.toString()) {
                const actor = await User.findById(userId).select("fullName");
                const actorName = actor ? actor.fullName : "Someone";

                notificationService.createNotification({
                    recipient: message.senderId,
                    type: "REACTION",
                    title: `Reaction from ${actorName}`,
                    message: `${actorName} reacted ${reaction} to your message`,
                    conversation: conversation._id,
                    sourceMessage: messageId,
                    actor: userId
                }).catch(err => logger.error({ event: "reaction.notification.error", error: err.message }, "Failed to create reaction notification"));
            }

            return { data: updatedReaction };
        } catch (err) {
            if (err.code === 11000) {
                return { error: { status: 409, message: "Reaction update conflict. Please retry." } };
            }
            throw err;
        }
    }

    /**
     * Removes a specific reaction from a message.
     */
    async removeReaction(messageId, userId, reaction) {
        if (!reaction) {
            return { error: { status: 400, message: "Reaction is required to remove" } };
        }

        const result = await MessageReaction.findOneAndDelete({ messageId, userId, reaction });

        if (!result) {
            return { error: { status: 404, message: "Reaction not found" } };
        }

        return { data: result };
    }
}

export const messageReactionService = new MessageReactionService();
