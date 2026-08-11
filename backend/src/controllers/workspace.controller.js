import Workspace from "../models/Workspace.js";
import Project from "../models/Project.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Create new workspace
// @route   POST /api/workspaces
// @access  Public
export const createWorkspace = asyncHandler(async (req, res) => {
    const { projectId, name, code } = req.body;

    // Validate that the project exists and is active
    const project = await Project.findOne({
        _id: projectId,
        isDeleted: false,
        status: "active"
    });

    if (!project) {
        return res.status(404).json({
            success: false,
            message: "Project not found or inactive"
        });
    }

    const workspace = await Workspace.create(req.body);

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
    const startIndex = (page - 1) * limit;

    const query = { isDeleted: false };

    // Status filter
    if (req.query.status) {
        query.status = req.query.status;
    } else {
        query.status = "active"; // default behavior based on docs
    }

    // Search filter
    if (req.query.search) {
        query.name = { $regex: req.query.search, $options: "i" };
    }

    const workspaces = await Workspace.find(query)
        .skip(startIndex)
        .limit(limit);

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
    const workspace = await Workspace.findOne({
        _id: req.params.id,
        isDeleted: false
    });

    if (!workspace) {
        return res.status(404).json({
            success: false,
            message: "Workspace not found"
        });
    }

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
    const startIndex = (page - 1) * limit;

    const query = { 
        projectId: req.params.projectId,
        isDeleted: false 
    };

    if (req.query.status) {
        query.status = req.query.status;
    } else {
        query.status = "active";
    }

    if (req.query.search) {
        query.name = { $regex: req.query.search, $options: "i" };
    }

    const workspaces = await Workspace.find(query)
        .skip(startIndex)
        .limit(limit);

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
    // Prevent updating protected fields
    if (req.body.isDeleted !== undefined) delete req.body.isDeleted;
    if (req.body.projectId !== undefined) delete req.body.projectId;

    const workspace = await Workspace.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        req.body,
        {
            new: true,
            runValidators: true
        }
    );

    if (!workspace) {
        return res.status(404).json({
            success: false,
            message: "Workspace not found"
        });
    }

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
    const workspace = await Workspace.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        {
            status: "inactive",
            isDeleted: true
        },
        { new: true }
    );

    if (!workspace) {
        return res.status(404).json({
            success: false,
            message: "Workspace not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Workspace deleted successfully"
    });
});
