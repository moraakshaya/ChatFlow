import { messageService } from "../../../services/message.service.js";
import { conversationService } from "../../../services/conversation.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

// @desc    Send a message via Public API
// @route   POST /api/v1/messages
// @access  Public (via API Key)
export const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, senderId, clientMessageId, type, content, attachments, replyTo, metadata } = req.body;
    const { projectId, organizationId } = req.apiContext;

    if (!conversationId || !senderId) {
        return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'conversationId and senderId are required' }
        });
    }

    // Enforce tenant isolation: Check if the conversation belongs to the authenticated project
    const conversation = await conversationService.getConversationById(conversationId, organizationId);
    
    if (!conversation || conversation.projectId.toString() !== projectId.toString()) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Conversation not found or does not belong to this project' }
        });
    }

    const message = await messageService.sendMessage({
        conversationId,
        senderId,
        clientMessageId,
        type: type || 'text',
        content,
        attachments,
        replyTo,
        metadata
    });

    res.status(201).json({
        success: true,
        data: message
    });
});

// @desc    Fetch messages via Public API
// @route   GET /api/v1/conversations/:conversationId/messages
// @access  Public (via API Key)
export const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { projectId, organizationId } = req.apiContext;

    // Enforce tenant isolation
    const conversation = await conversationService.getConversationById(conversationId, organizationId);
    
    if (!conversation || conversation.projectId.toString() !== projectId.toString()) {
        return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Conversation not found or does not belong to this project' }
        });
    }

    const result = await messageService.getMessages(conversationId, req.query);

    res.status(200).json({
        success: true,
        data: result.messages,
        pagination: result.pagination
    });
});
