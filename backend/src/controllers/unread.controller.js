import { unreadService } from "../services/unread.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get unread counts for all conversations
// @route   GET /api/conversations/unread
// @access  Private
export const getAllUnreadCounts = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const counts = await unreadService.getAllUnreadCounts(userId);

    res.status(200).json({
        success: true,
        data: counts
    });
});

// @desc    Get total unread count
// @route   GET /api/conversations/unread/total
// @access  Private
export const getTotalUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const totalUnread = await unreadService.getTotalUnreadCount(userId);

    res.status(200).json({
        success: true,
        data: {
            totalUnread
        }
    });
});

// @desc    Get unread count for a specific conversation
// @route   GET /api/conversations/:conversationId/unread
// @access  Private
export const getConversationUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const unreadCount = await unreadService.calculateUnreadCount(conversationId, userId);

    res.status(200).json({
        success: true,
        data: {
            conversationId,
            unreadCount
        }
    });
});

// @desc    Mark a conversation as read
// @route   PATCH /api/conversations/:conversationId/read
// @access  Private
export const markConversationAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { conversationId } = req.params;

    try {
        const result = await unreadService.markConversationAsRead(conversationId, userId);
        
        res.status(200).json({
            success: true,
            message: "Conversation marked as read",
            data: result
        });
    } catch (error) {
        if (error.message.includes("Access denied")) {
            return res.status(403).json({ success: false, message: error.message });
        }
        throw error;
    }
});
