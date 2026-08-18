import User from "../models/User.js";
import UserSession from "../models/UserSession.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword } from "../utils/password.js";

// @desc    Create a new user in the organization
// @route   POST /api/users
// @access  Private (Admin/Owner)
export const createUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        return res.status(409).json({ success: false, message: "User with this email already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
        organizationId: req.user.organizationId,
        fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || "member",
        status: "active"
    });

    res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role
        }
    });
});

// @desc    Get all users (in reality, filter by organization or workspace roles)
// @route   GET /api/users
// @access  Private (Admin typically)
export const getUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = { isDeleted: false, organizationId: req.user.organizationId };

    if (req.query.status) {
        query.status = req.query.status;
    }

    if (req.query.search) {
        query.fullName = { $regex: req.query.search, $options: "i" };
    }

    const users = await User.find(query)
        .select("-password")
        .skip(startIndex)
        .limit(limit);

    res.status(200).json({
        success: true,
        count: users.length,
        data: users
    });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findOne({
        _id: req.params.id,
        organizationId: req.user.organizationId,
        isDeleted: false
    }).select("-password");

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Update user
// @route   PATCH /api/users/:id
// @access  Private
export const updateUser = asyncHandler(async (req, res) => {
    // Prevent updating protected fields
    if (req.body.password !== undefined) delete req.body.password;
    if (req.body.isDeleted !== undefined) delete req.body.isDeleted;
    if (req.body.status !== undefined) delete req.body.status;
    if (req.body.organizationId !== undefined) delete req.body.organizationId;
    if (req.body.email !== undefined) delete req.body.email; // Usually email changes require separate flow

    const user = await User.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId, isDeleted: false },
        req.body,
        { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, message: "User updated successfully", data: user });
});

// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Private (Admin)
export const updateUserStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    const allowedStatuses = ["active", "inactive", "suspended"];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const user = await User.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId, isDeleted: false },
        { status },
        { new: true }
    ).select("-password");

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    if (status !== "active") {
        await UserSession.updateMany(
            { userId: user._id, revokedAt: null },
            { revokedAt: new Date() }
        );
    }

    res.status(200).json({ success: true, message: "User status updated", data: user });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findOneAndUpdate(
        { _id: req.params.id, organizationId: req.user.organizationId, isDeleted: false },
        { isDeleted: true, status: "inactive" },
        { new: true }
    );

    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // Revoke all sessions
    await UserSession.updateMany(
        { userId: user._id, revokedAt: null },
        { revokedAt: new Date() }
    );

    res.status(200).json({ success: true, message: "User deleted successfully" });
});
