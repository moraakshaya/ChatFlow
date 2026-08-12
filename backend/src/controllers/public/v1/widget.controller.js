import User from "../../../models/User.js";
import Project from "../../../models/Project.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import AppError from "../../../errors/AppError.js";
import { ERROR_CODES } from "../../../errors/errorCodes.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// @desc    Create a short-lived widget session
// @route   POST /api/projects/:projectId/widget/sessions
// @access  Public (via API Key)
export const createWidgetSession = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { externalUserId, name, email } = req.body;
    const { organizationId } = req.apiContext; // Comes from apiAuthentication middleware

    if (!externalUserId || !name || !email) {
        throw new AppError("externalUserId, name, and email are required", 400, ERROR_CODES.VALIDATION_ERROR);
    }

    // Verify project belongs to organization
    const project = await Project.findOne({ _id: projectId, organizationId, isDeleted: false });
    if (!project) {
        throw new AppError("Project not found or access denied", 403, ERROR_CODES.FORBIDDEN);
    }

    // Find or create external user
    let user = await User.findOne({
        organizationId,
        isExternal: true,
        externalUserId
    });

    if (!user) {
        // Create shadow user
        const dummyPassword = crypto.randomBytes(32).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(dummyPassword, salt);

        // Append externalUserId to email to avoid collisions with regular users or other external users who might share emails
        // Wait, the index is on { organizationId: 1, email: 1 } which must be unique.
        // It's safer to use a synthetic email for external users to guarantee uniqueness.
        const syntheticEmail = `${externalUserId.toLowerCase().replace(/[^a-z0-9]/g, '')}@ext.${organizationId}.local`;

        user = await User.create({
            organizationId,
            fullName: name,
            email: syntheticEmail, 
            password: hashedPassword,
            isExternal: true,
            externalUserId
        });
    } else {
        // Update name if changed
        if (user.fullName !== name) {
            user.fullName = name;
            await user.save();
        }
    }

    // Generate Widget Token
    const token = jwt.sign(
        { 
            id: user._id.toString(), 
            projectId: projectId.toString(),
            organizationId: organizationId.toString(),
            isWidgetContext: true
        },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "1h" }
    );

    res.status(201).json({
        success: true,
        data: {
            token,
            projectId,
            userId: user._id,
            scopes: ["chat:read", "chat:write"],
            expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
        }
    });
});
