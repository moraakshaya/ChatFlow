import crypto from "crypto";
import Attachment from "../models/Attachment.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import StorageService from "../services/storage.service.js";
import asyncHandler from "../utils/asyncHandler.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to check active membership
const verifyActiveMembership = async (conversationId, userId) => {
    const membership = await ConversationMember.findOne({
        conversationId,
        userId,
        status: "active"
    });
    return !!membership;
};

// @desc    Initialize a file upload
// @route   POST /api/attachments/upload/init
// @access  Private
export const initUpload = asyncHandler(async (req, res) => {
    const { fileName, mimeType, fileSize, conversationId, idempotencyKey } = req.body;
    const userId = req.user._id;

    if (!fileName || !mimeType || !fileSize || !conversationId) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (fileSize > MAX_FILE_SIZE) {
        return res.status(413).json({ success: false, message: "File size exceeds the allowed limit" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isMember = await verifyActiveMembership(conversationId, userId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    // Optional Idempotency handling (simple implementation checking metadata for the key)
    if (idempotencyKey) {
        const existing = await Attachment.findOne({ 
            uploadedBy: userId, 
            "metadata.idempotencyKey": idempotencyKey,
            status: { $in: ["pending", "uploading", "uploaded", "linked"] }
        });
        if (existing) {
            // Re-generate upload URL if still pending/uploading, otherwise just return the state
            if (existing.status === "pending" || existing.status === "uploading") {
                const { uploadUrl, expiresAt } = await StorageService.generateUploadUrl(existing.storageKey, existing.mimeType);
                return res.status(200).json({
                    success: true,
                    data: {
                        attachmentId: existing._id,
                        uploadUrl,
                        storageKey: existing.storageKey,
                        expiresAt,
                        status: existing.status
                    }
                });
            } else {
                return res.status(200).json({
                    success: true,
                    data: { attachmentId: existing._id, status: existing.status }
                });
            }
        }
    }

    // Generate secure storage key: organizations/orgId/projects/projId/workspaces/wsId/conversations/convId/uploads/uuid
    const uniqueId = crypto.randomUUID();
    const storageKey = `organizations/${conversation.organizationId}/projects/${conversation.projectId}/workspaces/${conversation.workspaceId}/conversations/${conversationId}/uploads/${uniqueId}`;

    const attachment = await Attachment.create({
        organizationId: conversation.organizationId,
        projectId: conversation.projectId,
        workspaceId: conversation.workspaceId,
        conversationId,
        uploadedBy: userId,
        fileName, // Ideally sanitized in production
        storageKey,
        storageProvider: "cloudinary",
        mimeType,
        fileSize,
        fileExtension: fileName.includes(".") ? fileName.substring(fileName.lastIndexOf(".")) : null,
        metadata: idempotencyKey ? { idempotencyKey } : {}
    });

    const { uploadUrl, expiresAt, cloudinaryData } = await StorageService.generateUploadUrl(storageKey, mimeType);

    res.status(201).json({
        success: true,
        data: {
            attachmentId: attachment._id,
            uploadUrl,
            storageKey,
            expiresAt,
            cloudinaryData,
            status: attachment.status
        }
    });
});

// @desc    Confirm and complete upload
// @route   POST /api/attachments/:attachmentId/complete
// @access  Private
export const completeUpload = asyncHandler(async (req, res) => {
    const { attachmentId } = req.params;
    const { cloudinaryUrl } = req.body;
    const userId = req.user._id;

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
        return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    // Only uploader can complete the upload phase
    if (attachment.uploadedBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized to complete this upload" });
    }

    if (attachment.status !== "pending" && attachment.status !== "uploading") {
        return res.status(400).json({ success: false, message: "Attachment is not in a valid state to be completed" });
    }

    const isValid = await StorageService.verifyObject(attachment.storageKey);
    if (!isValid || !cloudinaryUrl) {
        attachment.status = "failed";
        await attachment.save();
        return res.status(400).json({ success: false, message: "File verification failed or missing url" });
    }

    attachment.status = "uploaded";
    attachment.storageKey = cloudinaryUrl; // Save the secure URL so generateDownloadUrl works
    await attachment.save();

    res.status(200).json({
        success: true,
        message: "Attachment uploaded successfully",
        data: {
            attachmentId: attachment._id,
            status: attachment.status
        }
    });
});

// @desc    Get Attachment Metadata
// @route   GET /api/attachments/:attachmentId
// @access  Private
export const getAttachment = asyncHandler(async (req, res) => {
    const { attachmentId } = req.params;
    const userId = req.user._id;

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment || attachment.isDeleted) {
        return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    if (attachment.status === "linked") {
        const isMember = await verifyActiveMembership(attachment.conversationId, userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You don't have access to this conversation" });
        }
    } else {
        // Unlinked attachments are only visible to the uploader
        if (attachment.uploadedBy.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to access this unlinked attachment" });
        }
    }

    res.status(200).json({
        success: true,
        data: {
            _id: attachment._id,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            fileSize: attachment.fileSize,
            status: attachment.status
        }
    });
});

// @desc    Get Message Attachments
// @route   GET /api/attachments/message/:messageId
// @access  Private
export const getMessageAttachments = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
        return res.status(404).json({ success: false, message: "Message not found" });
    }

    const isMember = await verifyActiveMembership(message.conversationId, userId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You don't have access to this conversation" });
    }

    const attachments = await Attachment.find({
        messageId,
        status: "linked",
        isDeleted: false
    }).select("_id fileName mimeType fileSize status");

    res.status(200).json({
        success: true,
        data: attachments
    });
});

// @desc    Generate Download URL
// @route   GET /api/attachments/:attachmentId/download
// @access  Private
export const getDownloadUrl = asyncHandler(async (req, res) => {
    const { attachmentId } = req.params;
    const userId = req.user._id;

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment || attachment.isDeleted || attachment.status === "deleted") {
        return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    if (attachment.status === "linked") {
        const isMember = await verifyActiveMembership(attachment.conversationId, userId);
        if (!isMember) {
            return res.status(403).json({ success: false, message: "You don't have access to this conversation" });
        }
        
        // If linked, ensure the message isn't deleted (per spec, deleted message attachments become inaccessible)
        const message = await Message.findById(attachment.messageId);
        if (!message || message.isDeleted) {
            return res.status(403).json({ success: false, message: "Associated message is deleted" });
        }
    } else {
        if (attachment.uploadedBy.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to access this unlinked attachment" });
        }
    }

    const { downloadUrl, expiresAt } = await StorageService.generateDownloadUrl(attachment.storageKey);

    res.status(200).json({
        success: true,
        data: {
            downloadUrl,
            expiresAt
        }
    });
});

// @desc    Soft-delete Attachment
// @route   DELETE /api/attachments/:attachmentId
// @access  Private
export const deleteAttachment = asyncHandler(async (req, res) => {
    const { attachmentId } = req.params;
    const userId = req.user._id;

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment || attachment.isDeleted) {
        return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    // Only uploader can delete directly for now.
    if (attachment.uploadedBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized to delete this attachment" });
    }

    attachment.isDeleted = true;
    attachment.status = "deleted";
    await attachment.save();

    // Note: Physical deletion would be queued asynchronously here using StorageService.deleteFile(attachment.storageKey)

    res.status(200).json({
        success: true,
        message: "Attachment deleted successfully"
    });
});
