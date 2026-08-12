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

// @desc    Get all organizations (effectively just the user's organization)
// @route   GET /api/organizations
// @access  Private
export const getAllOrganizations = asyncHandler(async (req, res) => {
    const organizations = await Organization.find({ 
        _id: req.user.organizationId,
        isDeleted: false 
    });

    res.status(200).json({
        success: true,
        count: organizations.length,
        data: organizations
    });
});

// @desc    Get organization by ID
// @route   GET /api/organizations/:id
// @access  Private
export const getOrganizationById = asyncHandler(async (req, res) => {
    if (req.params.id !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

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
// @access  Private
export const getOrganizationBySlug = asyncHandler(async (req, res) => {
    const organization = await Organization.findOne({
        slug: req.params.slug,
        _id: req.user.organizationId,
        isDeleted: false
    });

    if (!organization) {
        return res.status(404).json({
            success: false,
            message: "Organization not found or access denied"
        });
    }

    res.status(200).json({
        success: true,
        data: organization
    });
});

// @desc    Update organization
// @route   PATCH /api/organizations/:id
// @access  Private
export const updateOrganization = asyncHandler(async (req, res) => {
    if (req.params.id !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

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
// @access  Private
export const deleteOrganization = asyncHandler(async (req, res) => {
    if (req.params.id !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: "Forbidden" });
    }

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