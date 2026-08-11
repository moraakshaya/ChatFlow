import Project from "../models/Project.js";
import Organization from "../models/Organization.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Create new project
// @route   POST /api/projects
// @access  Public
export const createProject = asyncHandler(async (req, res) => {
    const { organizationId, name, code } = req.body;

    // Validate that the organization exists and is not deleted
    const organization = await Organization.findOne({
        _id: organizationId,
        isDeleted: false
    });

    if (!organization) {
        return res.status(404).json({
            success: false,
            message: "Organization not found"
        });
    }

    // Mongoose duplicate key errors (11000) for name/code are typically handled by global error middleware.
    const project = await Project.create(req.body);

    res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: project
    });
});

// @desc    Get all active projects (Global)
// @route   GET /api/projects
// @access  Public (Should be Admin restricted eventually)
export const getAllProjects = asyncHandler(async (req, res) => {
    const projects = await Project.find({ isDeleted: false });

    res.status(200).json({
        success: true,
        count: projects.length,
        data: projects
    });
});

// @desc    Get projects by Organization ID
// @route   GET /api/projects/organization/:organizationId
// @access  Public
export const getProjectsByOrganization = asyncHandler(async (req, res) => {
    const projects = await Project.find({
        organizationId: req.params.organizationId,
        isDeleted: false
    });

    res.status(200).json({
        success: true,
        count: projects.length,
        data: projects
    });
});

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Public
export const getProjectById = asyncHandler(async (req, res) => {
    const project = await Project.findOne({
        _id: req.params.id,
        isDeleted: false
    });

    if (!project) {
        return res.status(404).json({
            success: false,
            message: "Project not found"
        });
    }

    res.status(200).json({
        success: true,
        data: project
    });
});

// @desc    Update project
// @route   PATCH /api/projects/:id
// @access  Public
export const updateProject = asyncHandler(async (req, res) => {
    // Prevent updating isDeleted flag via standard update route
    if (req.body.isDeleted !== undefined) {
        delete req.body.isDeleted;
    }

    // Prevent changing the organizationId
    if (req.body.organizationId !== undefined) {
        delete req.body.organizationId;
    }

    const project = await Project.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        req.body,
        {
            new: true,
            runValidators: true
        }
    );

    if (!project) {
        return res.status(404).json({
            success: false,
            message: "Project not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: project
    });
});

// @desc    Delete project (Soft Delete)
// @route   DELETE /api/projects/:id
// @access  Public
export const deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        {
            status: "inactive",
            isDeleted: true
        },
        { new: true }
    );

    if (!project) {
        return res.status(404).json({
            success: false,
            message: "Project not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Project deactivated successfully"
    });
});
