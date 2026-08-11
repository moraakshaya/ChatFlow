import ReadReceipt from "../models/ReadReceipt.js";
import Message from "../models/Message.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { readReceiptService } from "../services/readReceipt.service.js";

// @desc    Mark multiple messages as read
// @route   POST /api/read-receipts/read
// @access  Private
export const markMessagesAsRead = asyncHandler(async (req, res) => {
    const { conversationId, messageIds } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return res.status(400).json({ success: false, message: "messageIds array is required" });
    }

    if (messageIds.length > 100) {
        return res.status(400).json({ success: false, message: "Cannot update more than 100 messages at once" });
    }

    const isMember = await readReceiptService.verifyActiveMembership(conversationId, userId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    try {
        const updatedCount = await readReceiptService.markMultipleMessagesAsRead(conversationId, messageIds, userId);
        
        if (updatedCount === 0) {
            return res.status(200).json({ success: true, message: "No valid messages to mark as read" });
        }

        res.status(200).json({
            success: true,
            message: "Messages marked as read successfully"
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
});

// @desc    Get the last read message in canonical order for the authenticated user
// @route   GET /api/read-receipts/conversation/:conversationId/last-read
// @access  Private
export const getLastReadMessage = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const isMember = await readReceiptService.verifyActiveMembership(conversationId, userId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    // We must join with the Message collection to order by the Message's canonical createdAt, not the receipt's readAt.
    const pipeline = [
        {
            $match: {
                conversationId: mongoose.Types.ObjectId.createFromHexString(conversationId),
                userId: mongoose.Types.ObjectId.createFromHexString(userId.toString()),
                status: "read"
            }
        },
        {
            $lookup: {
                from: "messages",
                localField: "messageId",
                foreignField: "_id",
                as: "messageDetails"
            }
        },
        { $unwind: "$messageDetails" },
        {
            $sort: {
                "messageDetails.createdAt": -1,
                "messageDetails._id": -1
            }
        },
        { $limit: 1 }
    ];

    const results = await ReadReceipt.aggregate(pipeline);

    if (results.length === 0) {
        return res.status(200).json({
            success: true,
            data: null
        });
    }

    const lastReadMessage = results[0].messageDetails;
    
    // Sanitize if somehow the last read message is deleted
    if (lastReadMessage.isDeleted) {
        lastReadMessage.content = undefined;
        lastReadMessage.attachments = undefined;
    }

    res.status(200).json({
        success: true,
        data: lastReadMessage
    });
});

// @desc    Get unread message count for a conversation
// @route   GET /api/read-receipts/conversation/:conversationId/unread-count
// @access  Private
export const getUnreadCount = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.user._id;

    const isMember = await readReceiptService.verifyActiveMembership(conversationId, userId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    // First find the last read message
    const pipeline = [
        {
            $match: {
                conversationId: mongoose.Types.ObjectId.createFromHexString(conversationId),
                userId: mongoose.Types.ObjectId.createFromHexString(userId.toString()),
                status: "read"
            }
        },
        {
            $lookup: {
                from: "messages",
                localField: "messageId",
                foreignField: "_id",
                as: "messageDetails"
            }
        },
        { $unwind: "$messageDetails" },
        {
            $sort: {
                "messageDetails.createdAt": -1,
                "messageDetails._id": -1
            }
        },
        { $limit: 1 }
    ];

    const results = await ReadReceipt.aggregate(pipeline);
    
    let query = {
        conversationId,
        senderId: { $ne: userId }, // Exclude own messages
        isDeleted: false // Usually you don't count deleted messages as unread
    };

    if (results.length > 0) {
        const lastReadMsg = results[0].messageDetails;
        // Find messages strictly newer than the last read message
        query.$or = [
            { createdAt: { $gt: lastReadMsg.createdAt } },
            { createdAt: lastReadMsg.createdAt, _id: { $gt: lastReadMsg._id } }
        ];
    }

    const unreadCount = await Message.countDocuments(query);

    res.status(200).json({
        success: true,
        data: {
            unreadCount
        }
    });
});
