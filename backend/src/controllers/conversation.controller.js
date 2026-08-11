import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Workspace from "../models/Workspace.js";
import Project from "../models/Project.js";
import Organization from "../models/Organization.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Create new conversation
// @route   POST /api/conversations
// @access  Private
export const createConversation = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, type, name, description, icon, directKey } = req.body;

    // Validate the workspace belongs to the given project
    const workspace = await Workspace.findOne({
        _id: workspaceId,
        projectId,
        isDeleted: false,
        status: "active"
    });

    if (!workspace) {
        return res.status(404).json({
            success: false,
            message: "Workspace not found or invalid hierarchy"
        });
    }

    // Validate project belongs to organization
    const project = await Project.findOne({
        _id: projectId,
        organizationId: req.user.organizationId,
        isDeleted: false,
        status: "active"
    });

    if (!project) {
        return res.status(404).json({
            success: false,
            message: "Project not found or invalid hierarchy"
        });
    }

    // For private conversations, the directKey is required to prevent duplicates
    if (type === "private" && !directKey) {
        return res.status(400).json({
            success: false,
            message: "directKey is required for private conversations"
        });
    }

    const conversationData = {
        workspaceId,
        projectId,
        organizationId: req.user.organizationId,
        type,
        name: type === "private" ? undefined : name, // enforce schema rules
        description,
        icon,
        directKey: type === "private" ? directKey : undefined,
        createdBy: req.user._id,
    };

    const conversation = await Conversation.create(conversationData);

    // Automatically add the creator as the owner in the ConversationMembers collection
    await ConversationMember.create({
        conversationId: conversation._id,
        userId: req.user._id,
        role: "owner",
        status: "active",
        joinedAt: new Date()
    });

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
    // Note: Once ConversationMembers is implemented, this should filter strictly 
    // to conversations the user is a member of.
    // For now, we will query based on organizationId and filters.

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    // Enforce max limit of 100
    const actualLimit = limit > 100 ? 100 : limit;
    const startIndex = (page - 1) * actualLimit;

    const query = {
        organizationId: req.user.organizationId,
        isDeleted: false
    };

    if (req.query.workspaceId) query.workspaceId = req.query.workspaceId;
    if (req.query.projectId) query.projectId = req.query.projectId;
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;

    const conversations = await Conversation.find(query)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(startIndex)
        .limit(actualLimit);
    
    const total = await Conversation.countDocuments(query);

    res.status(200).json({
        success: true,
        data: conversations,
        pagination: {
            page,
            limit: actualLimit,
            total,
            totalPages: Math.ceil(total / actualLimit)
        }
    });
});

// @desc    Get conversation by ID
// @route   GET /api/conversations/:id
// @access  Private
export const getConversationById = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        isDeleted: false
    });

    if (!conversation) {
        return res.status(404).json({
            success: false,
            message: "Conversation not found"
        });
    }

    res.status(200).json({
        success: true,
        data: conversation
    });
});

// @desc    Get conversations by Workspace ID
// @route   GET /api/conversations/workspace/:workspaceId
// @access  Private
export const getConversationsByWorkspace = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const actualLimit = limit > 100 ? 100 : limit;
    const startIndex = (page - 1) * actualLimit;

    const query = {
        workspaceId: req.params.workspaceId,
        organizationId: req.user.organizationId,
        isDeleted: false
    };

    const conversations = await Conversation.find(query)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(startIndex)
        .limit(actualLimit);
    
    const total = await Conversation.countDocuments(query);

    res.status(200).json({
        success: true,
        data: conversations,
        pagination: {
            page,
            limit: actualLimit,
            total,
            totalPages: Math.ceil(total / actualLimit)
        }
    });
});

// @desc    Update conversation details
// @route   PATCH /api/conversations/:id
// @access  Private
export const updateConversation = asyncHandler(async (req, res) => {
    // Only allow specific fields
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.icon !== undefined) updates.icon = req.body.icon;

    const conversation = await Conversation.findOneAndUpdate(
        { 
            _id: req.params.id, 
            organizationId: req.user.organizationId, 
            isDeleted: false 
        },
        updates,
        { new: true, runValidators: true }
    );

    if (!conversation) {
        return res.status(404).json({
            success: false,
            message: "Conversation not found"
        });
    }

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
    const conversation = await Conversation.findOneAndUpdate(
        { 
            _id: req.params.id, 
            organizationId: req.user.organizationId, 
            isDeleted: false 
        },
        { status: "archived" },
        { new: true }
    );

    if (!conversation) {
        return res.status(404).json({
            success: false,
            message: "Conversation not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Conversation archived successfully"
    });
});

// @desc    Unarchive conversation
// @route   PATCH /api/conversations/:id/unarchive
// @access  Private
export const unarchiveConversation = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOneAndUpdate(
        { 
            _id: req.params.id, 
            organizationId: req.user.organizationId, 
            isDeleted: false 
        },
        { status: "active" },
        { new: true }
    );

    if (!conversation) {
        return res.status(404).json({
            success: false,
            message: "Conversation not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Conversation unarchived successfully"
    });
});

// @desc    Soft delete conversation
// @route   DELETE /api/conversations/:id
// @access  Private
export const deleteConversation = asyncHandler(async (req, res) => {
    const conversation = await Conversation.findOneAndUpdate(
        { 
            _id: req.params.id, 
            organizationId: req.user.organizationId, 
            isDeleted: false 
        },
        { isDeleted: true },
        { new: true }
    );

    if (!conversation) {
        return res.status(404).json({
            success: false,
            message: "Conversation not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Conversation deleted successfully",
        data: { isDeleted: true }
    });
});
