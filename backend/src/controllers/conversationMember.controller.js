import mongoose from "mongoose";
import ConversationMember from "../models/ConversationMember.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Add member to conversation
// @route   POST /api/conversation-members
// @access  Private
export const addMember = asyncHandler(async (req, res) => {
    const { conversationId, userId, role = "member" } = req.body;

    // Validate conversation
    const conversation = await Conversation.findOne({
        _id: conversationId,
        organizationId: req.user.organizationId,
        isDeleted: false
    });
    if (!conversation) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Check requester permission (must be owner or admin)
    const { authorizationService } = await import("../services/authorization.service.js");
    const canManage = await authorizationService.checkMemberManagement(req.user._id, conversationId);

    if (!canManage) {
        return res.status(403).json({ success: false, message: "You do not have permission to manage members" });
    }

    // Validate target user
    const targetUser = await User.findOne({
        _id: userId,
        organizationId: req.user.organizationId,
        isDeleted: false,
        status: "active"
    });
    if (!targetUser) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if membership already exists
    let membership = await ConversationMember.findOne({ conversationId, userId });

    if (membership) {
        if (membership.status === "active") {
            return res.status(409).json({ success: false, message: "User is already a member of this conversation" });
        }
        // Reactivate
        membership.status = "active";
        membership.joinedAt = new Date();
        membership.leftAt = null;
        membership.removedAt = null;
        membership.addedBy = req.user._id;
        membership.role = role;
        await membership.save();
    } else {
        membership = await ConversationMember.create({
            conversationId,
            userId,
            role,
            addedBy: req.user._id,
            status: "active"
        });
    }

    res.status(201).json({
        success: true,
        message: "Member added successfully",
        data: membership
    });
});

// @desc    Get members of a conversation
// @route   GET /api/conversation-members/conversation/:conversationId
// @access  Private
export const getConversationMembers = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    
    // Check if requester has access
    const { authorizationService } = await import("../services/authorization.service.js");
    const hasAccess = await authorizationService.checkConversationMembership(req.user._id, conversationId);

    if (!hasAccess) {
        return res.status(403).json({ success: false, message: "You are not a member of this conversation" });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const startIndex = (page - 1) * limit;

    const query = { conversationId, status: "active" };

    const members = await ConversationMember.find(query)
        .populate("userId", "fullName email avatar status")
        .skip(startIndex)
        .limit(limit);
    
    const total = await ConversationMember.countDocuments(query);

    res.status(200).json({
        success: true,
        data: members,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

// @desc    Get current user's conversations
// @route   GET /api/conversation-members/me
// @access  Private
export const getMyConversations = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;

    const query = { userId: req.user._id, status: "active" };
    
    // We populate the conversation and then filter to sort properly in memory, 
    // but in a production scaled app, an aggregate pipeline is better for sorting by `Conversation.lastMessageAt`.
    // We'll use aggregate here.
    
    const total = await ConversationMember.countDocuments(query);
    
    const pipeline = [
        { $match: { userId: mongoose.Types.ObjectId.createFromHexString(req.user._id.toString()), status: "active" } },
        {
            $lookup: {
                from: "conversations",
                localField: "conversationId",
                foreignField: "_id",
                as: "conversation"
            }
        },
        { $unwind: "$conversation" },
        { $match: { "conversation.isDeleted": false } },
        { $sort: { isPinned: -1, "conversation.lastMessageAt": -1, "conversation.createdAt": -1 } },
        { $skip: startIndex },
        { $limit: limit }
    ];

    const results = await ConversationMember.aggregate(pipeline);

    res.status(200).json({
        success: true,
        data: results,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

// @desc    Check membership
// @route   GET /api/conversation-members/check/:conversationId/:userId
// @access  Private
export const checkMembership = asyncHandler(async (req, res) => {
    const { conversationId, userId } = req.params;

    const membership = await ConversationMember.findOne({
        conversationId,
        userId
    });

    if (!membership || membership.status !== "active") {
        return res.status(200).json({
            success: true,
            data: { isMember: false }
        });
    }

    res.status(200).json({
        success: true,
        data: {
            isMember: true,
            role: membership.role,
            status: membership.status
        }
    });
});

// @desc    Update member role
// @route   PATCH /api/conversation-members/:id/role
// @access  Private (Owner only)
export const updateRole = asyncHandler(async (req, res) => {
    const { role } = req.body;
    
    const membership = await ConversationMember.findById(req.params.id);
    if (!membership || membership.status !== "active") {
        return res.status(404).json({ success: false, message: "Membership not found or inactive" });
    }

    // Check requester is owner
    const { authorizationService } = await import("../services/authorization.service.js");
    const isOwner = await authorizationService.checkConversationOwnership(req.user._id, membership.conversationId);

    if (!isOwner) {
        return res.status(403).json({ success: false, message: "Only owners can change roles" });
    }

    if (role === "owner") {
        return res.status(400).json({ success: false, message: "Use the transfer-ownership endpoint to change owners" });
    }

    membership.role = role;
    await membership.save();

    res.status(200).json({
        success: true,
        message: "Member role updated successfully",
        data: membership
    });
});

// @desc    Remove member
// @route   DELETE /api/conversation-members/:id
// @access  Private
export const removeMember = asyncHandler(async (req, res) => {
    const membership = await ConversationMember.findById(req.params.id);
    if (!membership || membership.status !== "active") {
        return res.status(404).json({ success: false, message: "Membership not found" });
    }

    if (membership.role === "owner") {
        return res.status(400).json({ success: false, message: "Cannot remove the owner" });
    }

    // Check requester permission
    const { authorizationService } = await import("../services/authorization.service.js");
    const canManage = await authorizationService.checkMemberManagement(req.user._id, membership.conversationId);

    if (!canManage) {
        return res.status(403).json({ success: false, message: "You do not have permission to manage members" });
    }

    membership.status = "removed";
    membership.removedAt = new Date();
    await membership.save();

    res.status(200).json({
        success: true,
        message: "Member removed successfully",
        data: membership
    });
});

// @desc    Leave conversation
// @route   PATCH /api/conversation-members/:id/leave
// @access  Private
export const leaveConversation = asyncHandler(async (req, res) => {
    const membership = await ConversationMember.findById(req.params.id);
    
    if (!membership || membership.status !== "active") {
        return res.status(404).json({ success: false, message: "Membership not found" });
    }

    if (membership.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "You can only leave your own memberships" });
    }

    if (membership.role === "owner") {
        return res.status(403).json({ success: false, message: "Owner must transfer ownership before leaving the conversation" });
    }

    membership.status = "left";
    membership.leftAt = new Date();
    await membership.save();

    res.status(200).json({
        success: true,
        message: "Left conversation successfully"
    });
});

// @desc    Mute conversation
// @route   PATCH /api/conversation-members/:id/mute
// @access  Private
export const muteConversation = asyncHandler(async (req, res) => {
    const { isMuted } = req.body;
    
    const membership = await ConversationMember.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isMuted },
        { new: true }
    );

    if (!membership) return res.status(404).json({ success: false, message: "Membership not found" });

    res.status(200).json({ success: true, message: "Conversation mute status updated", data: { isMuted: membership.isMuted } });
});

// @desc    Pin conversation
// @route   PATCH /api/conversation-members/:id/pin
// @access  Private
export const pinConversation = asyncHandler(async (req, res) => {
    const { isPinned } = req.body;
    
    const membership = await ConversationMember.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { isPinned },
        { new: true }
    );

    if (!membership) return res.status(404).json({ success: false, message: "Membership not found" });

    res.status(200).json({ success: true, message: "Conversation pin status updated", data: { isPinned: membership.isPinned } });
});

// @desc    Transfer ownership
// @route   PATCH /api/conversations/:conversationId/transfer-ownership
// @access  Private (Owner only)
export const transferOwnership = asyncHandler(async (req, res) => {
    const { newOwnerId } = req.body;
    const { conversationId } = req.params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { authorizationService } = await import("../services/authorization.service.js");
        const isOwner = await authorizationService.checkConversationOwnership(req.user._id, conversationId);

        if (!isOwner) {
            await session.abortTransaction();
            return res.status(403).json({ success: false, message: "Only the active owner can transfer ownership" });
        }

        const currentOwner = await ConversationMember.findOne({
            conversationId,
            userId: req.user._id,
            status: "active",
            role: "owner"
        }).session(session);

        const newOwner = await ConversationMember.findOne({
            conversationId,
            userId: newOwnerId,
            status: "active"
        }).session(session);

        if (!newOwner) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Target user is not an active member" });
        }

        currentOwner.role = "admin";
        newOwner.role = "owner";

        await currentOwner.save({ session });
        await newOwner.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: "Conversation ownership transferred successfully" });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});
