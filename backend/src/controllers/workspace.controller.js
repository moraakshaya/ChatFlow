import { workspaceService } from "../services/workspace.service.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Private
export const createWorkspace = asyncHandler(async (req, res) => {
    // Note: requireProjectAccess middleware already verified project access
    const workspaceData = {
        ...req.body,
        createdBy: req.user._id
    };

    const workspace = await workspaceService.createWorkspace(workspaceData);

    res.status(201).json({
        success: true,
        message: "Workspace created successfully",
        data: workspace
    });
});

// @desc    Get all workspaces (with pagination, status filter, and search)
// @route   GET /api/workspaces
// @access  Public
export const getAllWorkspaces = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const query = { isDeleted: false, status: req.query.status || "active" };

    if (req.query.search) {
        query.name = { $regex: req.query.search, $options: "i" };
    }

    const workspaces = await workspaceService.getWorkspaces(query, { page, limit });

    res.status(200).json({
        success: true,
        count: workspaces.length,
        data: workspaces
    });
});

// @desc    Get workspace by ID
// @route   GET /api/workspaces/:id
// @access  Public
export const getWorkspaceById = asyncHandler(async (req, res) => {
    const workspace = await workspaceService.getWorkspaceById(req.params.id);

    res.status(200).json({
        success: true,
        data: workspace
    });
});

// @desc    Get workspaces by Project ID (with pagination, status filter, and search)
// @route   GET /api/workspaces/project/:projectId
// @access  Public
export const getWorkspacesByProject = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const query = { 
        projectId: req.params.projectId,
        isDeleted: false,
        status: req.query.status || "active"
    };

    if (req.query.search) {
        query.name = { $regex: req.query.search, $options: "i" };
    }

    const workspaces = await workspaceService.getWorkspaces(query, { page, limit });

    res.status(200).json({
        success: true,
        count: workspaces.length,
        data: workspaces
    });
});

// @desc    Update workspace
// @route   PATCH /api/workspaces/:id
// @access  Public
export const updateWorkspace = asyncHandler(async (req, res) => {
    const workspace = await workspaceService.updateWorkspace(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message: "Workspace updated successfully",
        data: workspace
    });
});

// @desc    Delete workspace (Soft Delete)
// @route   DELETE /api/workspaces/:id
// @access  Public
export const deleteWorkspace = asyncHandler(async (req, res) => {
    await workspaceService.deleteWorkspace(req.params.id);

    res.status(200).json({
        success: true,
        message: "Workspace deleted successfully"
    });
});
