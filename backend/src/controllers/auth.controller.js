import crypto from "crypto";
import User from "../models/User.js";
import UserSession from "../models/UserSession.js";
import Organization from "../models/Organization.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import asyncHandler from "../utils/asyncHandler.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { sendPasswordResetEmail } from "../utils/email.js";

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req, res) => {
    const { organizationName, fullName, email, password } = req.body;

    // Check if user already exists across the platform (if email is globally unique) or just let it pass until org creation
    // Wait, since we are creating an org, the email should just not exist in the new org (which it won't).
    
    // Generate slug from organizationName
    const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    
    // Check if organization slug already exists
    const existingOrg = await Organization.findOne({ slug });
    if (existingOrg) {
        return res.status(409).json({ success: false, message: "Organization name already exists (try a different one)" });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create organization
    const org = await Organization.create({
        name: organizationName,
        slug
    });

    // Create user
    const user = await User.create({
        organizationId: org._id,
        fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "owner"
    });

    // Assign owner to organization
    org.owner = user._id;
    await org.save();

    // Create tokens and session
    const accessToken = generateAccessToken(user._id, user.organizationId);
    const refreshToken = generateRefreshToken(user._id);
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    // Expiry from env, fallback 7d
    const expiryDays = process.env.JWT_REFRESH_EXPIRES_IN ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN) : 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await UserSession.create({
        userId: user._id,
        refreshTokenHash,
        deviceInfo: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt,
        lastUsedAt: new Date(),
    });

    res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
            user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role },
            organization: { _id: org._id, name: org.name, slug: org.slug, plan: org.plan },
            accessToken,
            refreshToken,
        },
    });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });

    if (!user || user.status !== "active") {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const accessToken = generateAccessToken(user._id, user.organizationId);
    const refreshToken = generateRefreshToken(user._id);
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const expiryDays = process.env.JWT_REFRESH_EXPIRES_IN ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN) : 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await UserSession.create({
        userId: user._id,
        refreshTokenHash,
        deviceInfo: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt,
        lastUsedAt: new Date(),
    });

    const org = await Organization.findById(user.organizationId);

    res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
            user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role },
            organization: org ? { _id: org._id, name: org.name, slug: org.slug, plan: org.plan } : null,
            accessToken,
            refreshToken,
        },
    });
});

// @desc    Refresh Token
// @route   POST /api/auth/refresh
// @access  Public
export const refresh = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ success: false, message: "No token provided" });
    }

    let decoded;
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const session = await UserSession.findOne({ userId: decoded.userId, refreshTokenHash });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findOne({ _id: decoded.userId, isDeleted: false, status: "active" });
    if (!user) {
        return res.status(401).json({ success: false, message: "User not found or inactive" });
    }

    // Revoke old session and rotate
    session.revokedAt = new Date();
    await session.save();

    const newAccessToken = generateAccessToken(user._id, user.organizationId);
    const newRefreshToken = generateRefreshToken(user._id);
    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    const expiryDays = process.env.JWT_REFRESH_EXPIRES_IN ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN) : 7;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await UserSession.create({
        userId: user._id,
        refreshTokenHash: newRefreshTokenHash,
        deviceInfo: req.headers["user-agent"],
        ipAddress: req.ip,
        expiresAt,
        lastUsedAt: new Date(),
    });

    res.status(200).json({
        success: true,
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        },
    });
});

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Public
export const logout = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        await UserSession.findOneAndUpdate(
            { refreshTokenHash },
            { revokedAt: new Date() }
        );
    }

    res.status(200).json({ success: true, message: "Logout successful" });
});

// @desc    Logout from all devices
// @route   POST /api/auth/logout-all
// @access  Private
export const logoutAll = asyncHandler(async (req, res) => {
    await UserSession.updateMany(
        { userId: req.user._id, revokedAt: null },
        { revokedAt: new Date() }
    );

    res.status(200).json({ success: true, message: "All sessions logged out successfully" });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user,
    });
});

// @desc    Change password
// @route   PATCH /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
        return res.status(400).json({ success: false, message: "Invalid current password" });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    // Revoke existing sessions for security
    await UserSession.updateMany(
        { userId: req.user._id, revokedAt: null },
        { revokedAt: new Date() }
    );

    res.status(200).json({ success: true, message: "Password changed successfully" });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false, status: "active" });
    
    if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

        const expiryMinutes = process.env.PASSWORD_RESET_EXPIRES_IN ? parseInt(process.env.PASSWORD_RESET_EXPIRES_IN) : 15;
        const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

        await PasswordResetToken.create({
            userId: user._id,
            tokenHash,
            expiresAt,
        });

        await sendPasswordResetEmail(user.email, resetToken);
    }

    res.status(200).json({
        success: true,
        message: "If an account exists, a password reset link has been sent.",
    });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const resetRecord = await PasswordResetToken.findOne({
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: new Date() }
    });

    if (!resetRecord) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    const user = await User.findById(resetRecord.userId);
    if (!user || user.isDeleted || user.status !== "active") {
        return res.status(400).json({ success: false, message: "User account is no longer valid" });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    resetRecord.usedAt = new Date();
    await resetRecord.save();

    // Revoke existing sessions
    await UserSession.updateMany(
        { userId: user._id, revokedAt: null },
        { revokedAt: new Date() }
    );

    res.status(200).json({ success: true, message: "Password reset successfully" });
});
