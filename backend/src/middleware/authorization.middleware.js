import { authorizationService } from "../services/authorization.service.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Middleware to check if user has access to a project.
 * Uses `projectId` from params or body.
 */
export const requireProjectAccess = asyncHandler(async (req, res, next) => {
    const projectId = req.params.projectId || req.params.id || req.body.projectId;
    if (!projectId) {
        return res.status(400).json({ success: false, message: "Project ID is required" });
    }

    const hasAccess = await authorizationService.checkProjectAccess(req.user._id, req.user.organizationId, projectId);
    if (!hasAccess) {
        return res.status(404).json({ success: false, message: "Project not found or access denied" });
    }

    next();
});

/**
 * Middleware to check if user has access to a workspace.
 * Uses `workspaceId` from params or body.
 */
export const requireWorkspaceAccess = asyncHandler(async (req, res, next) => {
    const workspaceId = req.params.workspaceId || req.params.id || req.body.workspaceId;
    if (!workspaceId) {
        return res.status(400).json({ success: false, message: "Workspace ID is required" });
    }

    const hasAccess = await authorizationService.checkWorkspaceAccess(req.user._id, req.user.organizationId, workspaceId);
    if (!hasAccess) {
        return res.status(404).json({ success: false, message: "Workspace not found or access denied" });
    }

    next();
});

/**
 * Middleware to check if user is a member of a conversation.
 * Uses `conversationId` from params or body.
 */
export const requireConversationMembership = asyncHandler(async (req, res, next) => {
    // If it's `/:id` in conversation routes, it might just be `id`
    const conversationId = req.params.conversationId || req.params.id || req.body.conversationId;
    
    if (!conversationId) {
        return res.status(400).json({ success: false, message: "Conversation ID is required" });
    }

    const isMember = await authorizationService.checkConversationMembership(req.user._id, conversationId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "Access denied: Not a member of this conversation" });
    }

    next();
});

/**
 * Middleware to check if user can manage a conversation.
 */
export const requireConversationManagement = asyncHandler(async (req, res, next) => {
    const conversationId = req.params.conversationId || req.params.id || req.body.conversationId;
    
    if (!conversationId) {
        return res.status(400).json({ success: false, message: "Conversation ID is required" });
    }

    const canManage = await authorizationService.checkConversationManagement(req.user._id, conversationId);
    if (!canManage) {
        return res.status(403).json({ success: false, message: "Access denied: Missing management permissions" });
    }

    next();
});
