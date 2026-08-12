import { conversationService } from "../../../services/conversation.service.js";
import asyncHandler from "../../../utils/asyncHandler.js";

// @desc    Create a conversation (Public API)
// @route   POST /api/v1/conversations
// @access  Public (via API Key)
export const createConversation = asyncHandler(async (req, res) => {
    const { workspaceId, type, name, description, icon, directKey, createdBy } = req.body;
    const { projectId, organizationId } = req.apiContext;

    if (!workspaceId || !createdBy) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'workspaceId and createdBy are required'
            }
        });
    }

    const conversationData = {
        workspaceId,
        projectId, // Bound strictly to the context projectId to enforce tenant isolation
        organizationId,
        type: type || 'channel',
        name,
        description,
        icon,
        directKey,
        createdBy,
    };

    const conversation = await conversationService.createConversation(conversationData);

    res.status(201).json({
        success: true,
        data: conversation
    });
});

// @desc    Get all conversations for the project (Public API)
// @route   GET /api/v1/conversations
// @access  Public (via API Key)
export const getConversations = asyncHandler(async (req, res) => {
    const { projectId } = req.apiContext;
    const result = await conversationService.getConversationsForProject(projectId, req.query);

    res.status(200).json({
        success: true,
        data: result.conversations,
        pagination: result.pagination
    });
});
