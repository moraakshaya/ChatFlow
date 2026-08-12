import { webhookService } from "../services/webhook.service.js";
import { webhookEventService } from "../services/webhookEvent.service.js";
import Project from "../models/Project.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

// Helper to verify project belongs to user's organization
const verifyProjectAccess = async (projectId, organizationId) => {
    const project = await Project.findOne({ _id: projectId, organizationId, isDeleted: false });
    if (!project) {
        throw new AppError("Project not found or access denied", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
    }
    return project;
};

// @desc    Create a new Webhook
// @route   POST /api/projects/:projectId/webhooks
// @access  Private
export const createWebhook = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { name, url, events } = req.body;
    
    await verifyProjectAccess(projectId, req.user.organizationId);

    if (!name || !url) {
        throw new AppError("Webhook name and url are required", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const webhook = await webhookService.createWebhook({
        projectId,
        organizationId: req.user.organizationId,
        name,
        url,
        events,
        createdBy: req.user._id
    });

    res.status(201).json({
        success: true,
        message: "Webhook created successfully",
        data: webhook
    });
});

// @desc    List all Webhooks for a project
// @route   GET /api/projects/:projectId/webhooks
// @access  Private
export const listWebhooks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    await verifyProjectAccess(projectId, req.user.organizationId);

    const webhooks = await webhookService.listWebhooks(projectId, req.user.organizationId);

    res.status(200).json({
        success: true,
        data: webhooks
    });
});

// @desc    Get Webhook details
// @route   GET /api/projects/:projectId/webhooks/:webhookId
// @access  Private
export const getWebhook = asyncHandler(async (req, res) => {
    const { projectId, webhookId } = req.params;
    await verifyProjectAccess(projectId, req.user.organizationId);

    const webhook = await webhookService.getWebhook(webhookId, projectId, req.user.organizationId);

    res.status(200).json({
        success: true,
        data: webhook
    });
});

// @desc    Update Webhook
// @route   PATCH /api/projects/:projectId/webhooks/:webhookId
// @access  Private
export const updateWebhook = asyncHandler(async (req, res) => {
    const { projectId, webhookId } = req.params;
    await verifyProjectAccess(projectId, req.user.organizationId);

    const webhook = await webhookService.updateWebhook(webhookId, projectId, req.user.organizationId, req.body);

    res.status(200).json({
        success: true,
        message: "Webhook updated successfully",
        data: webhook
    });
});

// @desc    Enable Webhook
// @route   PATCH /api/projects/:projectId/webhooks/:webhookId/enable
// @access  Private
export const enableWebhook = asyncHandler(async (req, res) => {
    const { projectId, webhookId } = req.params;
    await verifyProjectAccess(projectId, req.user.organizationId);

    const webhook = await webhookService.toggleStatus(webhookId, projectId, req.user.organizationId, "active");

    res.status(200).json({
        success: true,
        message: "Webhook enabled successfully",
        data: webhook
    });
});

// @desc    Disable Webhook
// @route   PATCH /api/projects/:projectId/webhooks/:webhookId/disable
// @access  Private
export const disableWebhook = asyncHandler(async (req, res) => {
    const { projectId, webhookId } = req.params;
    await verifyProjectAccess(projectId, req.user.organizationId);

    const webhook = await webhookService.toggleStatus(webhookId, projectId, req.user.organizationId, "inactive");

    res.status(200).json({
        success: true,
        message: "Webhook disabled successfully",
        data: webhook
    });
});

// @desc    Delete Webhook
// @route   DELETE /api/projects/:projectId/webhooks/:webhookId
// @access  Private
export const deleteWebhook = asyncHandler(async (req, res) => {
    const { projectId, webhookId } = req.params;
    await verifyProjectAccess(projectId, req.user.organizationId);

    await webhookService.deleteWebhook(webhookId, projectId, req.user.organizationId);

    res.status(200).json({
        success: true,
        message: "Webhook deleted successfully"
    });
});

// @desc    Test Webhook
// @route   POST /api/projects/:projectId/webhooks/:webhookId/test
// @access  Private
export const testWebhook = asyncHandler(async (req, res) => {
    const { projectId, webhookId } = req.params;
    await verifyProjectAccess(projectId, req.user.organizationId);

    // Verify it exists
    await webhookService.getWebhook(webhookId, projectId, req.user.organizationId);

    await webhookEventService.dispatchTestEvent(webhookId, projectId);

    res.status(202).json({
        success: true,
        message: "Test webhook event queued"
    });
});
