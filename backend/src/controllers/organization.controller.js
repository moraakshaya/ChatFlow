import Organization from "../models/Organization.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Create new organization
// @route   POST /api/organizations
// @access  Public
export const createOrganization = asyncHandler(async (req, res) => {
    // Mongoose handles the duplicate slug error via code 11000 in error handler
    const organization = await Organization.create(req.body);

    res.status(201).json({
        success: true,
        message: "Organization created successfully",
        data: organization
    });
});

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Public
export const getAllOrganizations = asyncHandler(async (req, res) => {
    const organizations = await Organization.find({ isDeleted: false });

    res.status(200).json({
        success: true,
        count: organizations.length,
        data: organizations
    });
});

// @desc    Get organization by ID
// @route   GET /api/organizations/:id
// @access  Public
export const getOrganizationById = asyncHandler(async (req, res) => {
    const organization = await Organization.findOne({
        _id: req.params.id,
        isDeleted: false
    });

    if (!organization) {
        return res.status(404).json({
            success: false,
            message: "Organization not found"
        });
    }

    res.status(200).json({
        success: true,
        data: organization
    });
});

// @desc    Get organization by slug
// @route   GET /api/organizations/slug/:slug
// @access  Public
export const getOrganizationBySlug = asyncHandler(async (req, res) => {
    const organization = await Organization.findOne({
        slug: req.params.slug,
        isDeleted: false
    });

    if (!organization) {
        return res.status(404).json({
            success: false,
            message: "Organization not found"
        });
    }

    res.status(200).json({
        success: true,
        data: organization
    });
});

// @desc    Update organization
// @route   PATCH /api/organizations/:id
// @access  Public
export const updateOrganization = asyncHandler(async (req, res) => {
    // Prevent updating isDeleted flag via standard update route
    if (req.body.isDeleted !== undefined) {
        delete req.body.isDeleted;
    }

    const organization = await Organization.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        req.body,
        {
            new: true,
            runValidators: true
        }
    );

    if (!organization) {
        return res.status(404).json({
            success: false,
            message: "Organization not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Organization updated successfully",
        data: organization
    });
});

// @desc    Delete organization (Soft Delete)
// @route   DELETE /api/organizations/:id
// @access  Public
export const deleteOrganization = asyncHandler(async (req, res) => {
    const organization = await Organization.findOneAndUpdate(
        { _id: req.params.id, isDeleted: false },
        {
            status: "inactive",
            isDeleted: true
        },
        { new: true }
    );

    if (!organization) {
        return res.status(404).json({
            success: false,
            message: "Organization not found"
        });
    }

    res.status(200).json({
        success: true,
        message: "Organization deactivated successfully"
    });
});