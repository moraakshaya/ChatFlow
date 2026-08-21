import { messageService } from "../services/message.service.js";
import { authorizationService } from "../services/authorization.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// Helper function to check if the user is an active member
const verifyActiveMembership = async (conversationId, userId) => {
    return authorizationService.checkConversationMembership(userId, conversationId);
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, clientMessageId, type, content, attachments, replyTo, metadata } = req.body;
    const senderId = req.user._id;

    // Verify active membership
    const isMember = await verifyActiveMembership(conversationId, senderId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    const message = await messageService.sendMessage({
        conversationId,
        senderId,
        clientMessageId,
        type,
        content,
        attachments,
        replyTo,
        metadata
    });

    res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message
    });
});

// @desc    Retrieve messages with cursor-based pagination
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;

    // Verify active membership
    const isMember = await verifyActiveMembership(conversationId, req.user._id);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    const result = await messageService.getMessages(conversationId, req.query);

    res.status(200).json({
        success: true,
        data: result.messages,
        pagination: result.pagination
    });
});



// @desc    Soft delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = asyncHandler(async (req, res) => {
    const messageId = req.params.messageId;

    const message = await messageService.deleteMessage(messageId, req.user._id);

    res.status(200).json({
        success: true,
        message: "Message deleted successfully",
        data: message // sanitized state returned
    });
});
