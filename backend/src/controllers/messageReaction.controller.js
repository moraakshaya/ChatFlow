import mongoose from "mongoose";
import MessageReaction from "../models/MessageReaction.js";
import Message from "../models/Message.js";
import ConversationMember from "../models/ConversationMember.js";
import Conversation from "../models/Conversation.js";
import asyncHandler from "../utils/asyncHandler.js";

import { messageReactionService } from "../services/messageReaction.service.js";

// @desc    Add or update a reaction to a message
// @route   POST /api/message-reactions
// @access  Private
export const addOrUpdateReaction = asyncHandler(async (req, res) => {
    const { messageId, reaction } = req.body;
    const userId = req.user._id;

    const result = await messageReactionService.addReaction(messageId, userId, reaction);

    if (result.error) {
        return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    res.status(200).json({
        success: true,
        message: "Reaction applied successfully",
        data: result.data
    });
});

// @desc    Get reactions for a message
// @route   GET /api/message-reactions/message/:messageId
// @access  Private
export const getMessageReactions = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Validate message exists and membership
    const { error, message } = await messageReactionService.validateReactionPreconditions(messageId, userId);
    
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
    const { reaction } = req.body;
    const userId = req.user._id;

    const result = await messageReactionService.removeReaction(messageId, userId, reaction);

    if (result.error) {
        return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    res.status(200).json({
        success: true,
        message: "Reaction removed successfully"
    });
});
