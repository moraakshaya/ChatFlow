import mongoose from "mongoose";
import MessageReaction from "../models/MessageReaction.js";
import Message from "../models/Message.js";
import ConversationMember from "../models/ConversationMember.js";
import Conversation from "../models/Conversation.js";
import asyncHandler from "../utils/asyncHandler.js";

// Validation helper
const validateReactionPreconditions = async (messageId, userId) => {
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

    const membership = await ConversationMember.findOne({
        conversationId: message.conversationId,
        userId,
        status: "active"
    });

    if (!membership) {
        return { error: { status: 403, message: "You are not an active member of this conversation" } };
    }

    return { message, conversation, membership };
};

// @desc    Add or update a reaction to a message
// @route   POST /api/message-reactions
// @access  Private
export const addOrUpdateReaction = asyncHandler(async (req, res) => {
    const { messageId, reaction } = req.body;
    const userId = req.user._id;

    if (!reaction) {
        return res.status(400).json({ success: false, message: "Reaction is required" });
    }

    // Verify preconditions
    const { error, message, conversation } = await validateReactionPreconditions(messageId, userId);
    if (error) {
        return res.status(error.status).json({ success: false, message: error.message });
    }

    // Validate enum format
    const allowedReactions = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
    if (!allowedReactions.includes(reaction)) {
        return res.status(400).json({ success: false, message: "Invalid reaction" });
    }

    try {
        // Upsert behavior using findOneAndUpdate to handle concurrent updates atomically
        const updatedReaction = await MessageReaction.findOneAndUpdate(
            { messageId, userId },
            {
                organizationId: conversation.organizationId,
                projectId: conversation.projectId,
                workspaceId: conversation.workspaceId,
                conversationId: conversation._id,
                reaction
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Reaction applied successfully",
            data: updatedReaction
        });
    } catch (err) {
        // Handle unique index conflict in case upsert triggers duplicate key under high concurrency
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: "Reaction update conflict. Please retry." });
        }
        throw err;
    }
});

// @desc    Get reactions for a message
// @route   GET /api/message-reactions/message/:messageId
// @access  Private
export const getMessageReactions = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Validate message exists and membership
    const { error, message } = await validateReactionPreconditions(messageId, userId);
    
    // If deleted, we return sanitized empty array as per specs
    if (error && error.status === 400 && error.message === "Cannot react to a deleted message") {
        return res.status(200).json({
            success: true,
            data: { reactions: [] }
        });
    } else if (error) {
        return res.status(error.status).json({ success: false, message: error.message });
    }

    // Aggregation pipeline to group and count reactions
    const pipeline = [
        { 
            $match: { messageId: mongoose.Types.ObjectId.createFromHexString(messageId) } 
        },
        {
            $group: {
                _id: "$reaction",
                count: { $sum: 1 },
                reactedByMe: {
                    $max: {
                        $cond: [{ $eq: ["$userId", mongoose.Types.ObjectId.createFromHexString(userId.toString())] }, true, false]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                reaction: "$_id",
                count: 1,
                reactedByMe: 1
            }
        },
        {
            $sort: { count: -1 }
        }
    ];

    const reactions = await MessageReaction.aggregate(pipeline);

    res.status(200).json({
        success: true,
        data: { reactions }
    });
});

// @desc    Remove the current user's reaction from a message
// @route   DELETE /api/message-reactions/message/:messageId
// @access  Private
export const removeReaction = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const result = await MessageReaction.findOneAndDelete({ messageId, userId });

    if (!result) {
        return res.status(404).json({ success: false, message: "Reaction not found" });
    }

    res.status(200).json({
        success: true,
        message: "Reaction removed successfully"
    });
});
