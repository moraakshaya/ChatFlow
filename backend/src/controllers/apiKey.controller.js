import { apiKeyService } from "../services/apiKey.service.js";
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

// @desc    Create a new API Key for a project
// @route   POST /api/projects/:projectId/api-keys
// @access  Private
export const createApiKey = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { name, scopes, expiresAt, prefix } = req.body;
    
    await verifyProjectAccess(projectId, req.user.organizationId);

    if (!name) {
        throw new AppError("API Key name is required", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const { fullKey, metadata } = await apiKeyService.createApiKey({
        projectId,
        organizationId: req.user.organizationId,
        name,
        scopes,
        createdBy: req.user._id,
        expiresAt,
        prefix
    });

    res.status(201).json({
        success: true,
        message: "API Key created successfully",
        data: {
            ...metadata,
            key: fullKey // Sent only once!
        }
    });
});

// @desc    List all API Keys for a project
// @route   GET /api/projects/:projectId/api-keys
// @access  Private
export const listApiKeys = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    
    await verifyProjectAccess(projectId, req.user.organizationId);

    const keys = await apiKeyService.listApiKeys(projectId, req.user.organizationId);

    res.status(200).json({
        success: true,
        data: keys
    });
});

// @desc    Get API Key details
// @route   GET /api/projects/:projectId/api-keys/:keyId
// @access  Private
export const getApiKey = asyncHandler(async (req, res) => {
    const { projectId, keyId } = req.params;

    await verifyProjectAccess(projectId, req.user.organizationId);

    const key = await apiKeyService.getApiKey(keyId, projectId, req.user.organizationId);

    res.status(200).json({
        success: true,
        data: key
    });
});

// @desc    Revoke API Key
// @route   PATCH /api/projects/:projectId/api-keys/:keyId/revoke
// @access  Private
export const revokeApiKey = asyncHandler(async (req, res) => {
    const { projectId, keyId } = req.params;

    await verifyProjectAccess(projectId, req.user.organizationId);

    const key = await apiKeyService.revokeApiKey(keyId, projectId, req.user.organizationId);

    res.status(200).json({
        success: true,
        message: "API Key revoked successfully",
        data: key
    });
});
