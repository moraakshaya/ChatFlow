import { conversationService } from "../services/conversation.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Create new conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, type, name, description, icon, directKey } = req.body;

    const { authorizationService } = await import("../services/authorization.service.js");
    const hasWorkspaceAccess = await authorizationService.checkWorkspaceAccess(req.user._id, req.user.organizationId, workspaceId);

    if (!hasWorkspaceAccess) {
        return res.status(404).json({
            success: false,
            message: "Workspace not found or access denied"
        });
    }

    const conversationData = {
        workspaceId,
        projectId,
        organizationId: req.user.organizationId,
        type,
        name,
        description,
        icon,
        directKey,
        createdBy: req.user._id,
    };

    const conversation = await conversationService.createConversation(conversationData);

    res.status(201).json({
        success: true,
        message: "Conversation created successfully",
        data: {
            _id: conversation._id,
            type: conversation.type,
            name: conversation.name,
            status: conversation.status
        }
    });
});

// @desc    Get all accessible conversations (with pagination)
// @route   GET /api/conversations
// @access  Private
export const getConversations = asyncHandler(async (req, res) => {
    const result = await conversationService.getConversationsForUser(req.user._id, req.query);

    res.status(200).json({
        success: true,
        data: result.conversations,
        pagination: result.pagination
    });
});

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
export const getConversationById = asyncHandler(async (req, res) => {
    const conversation = await conversationService.getConversationById(req.params.id, req.user.organizationId);

    res.status(200).json({
        success: true,
        data: conversation
    });
});

// @desc    Get conversations by Workspace ID
// @route   GET /api/conversations/workspace/:workspaceId
// @access  Private
export const getConversationsByWorkspace = asyncHandler(async (req, res) => {
    const queryParams = { ...req.query, workspaceId: req.params.workspaceId };
    const result = await conversationService.getConversationsForUser(req.user._id, queryParams);

    res.status(200).json({
        success: true,
        data: result.conversations,
        pagination: result.pagination
    });
});

// @desc    Update conversation details
// @route   PATCH /api/conversations/:id
// @access  Private
export const updateConversation = asyncHandler(async (req, res) => {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.icon !== undefined) updates.icon = req.body.icon;

    const conversation = await conversationService.updateConversation(req.params.id, req.user.organizationId, updates);

    res.status(200).json({
        success: true,
        message: "Conversation updated successfully",
        data: conversation
    });
});

// @desc    Archive conversation
// @route   PATCH /api/conversations/:id/archive
// @access  Private
export const archiveConversation = asyncHandler(async (req, res) => {
    await conversationService.archiveConversation(req.params.id, req.user.organizationId);

    res.status(200).json({
        success: true,
        message: "Conversation archived successfully"
    });
});

// @desc    Unarchive conversation
// @route   PATCH /api/conversations/:id/unarchive
// @access  Private
export const unarchiveConversation = asyncHandler(async (req, res) => {
    await conversationService.unarchiveConversation(req.params.id, req.user.organizationId);

    res.status(200).json({
        success: true,
        message: "Conversation unarchived successfully"
    });
});

// @desc    Soft delete conversation
// @route   DELETE /api/conversations/:id
// @access  Private
export const deleteConversation = asyncHandler(async (req, res) => {
    await conversationService.deleteConversation(req.params.id, req.user.organizationId);

    res.status(200).json({
        success: true,
        message: "Conversation deleted successfully",
        data: { isDeleted: true }
    });
});
