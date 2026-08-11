import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null, // Null until linked to a message
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        storageKey: {
            type: String,
            required: true,
        },
        storageProvider: {
            type: String,
            required: true, // e.g., 's3', 'mock', 'local'
        },
        mimeType: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        fileExtension: {
            type: String,
            default: null,
        },
        thumbnailStorageKey: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["pending", "uploading", "uploaded", "linked", "failed", "deleted"],
            default: "pending",
        },
        checksum: {
            type: String,
            default: null,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

attachmentSchema.index({ conversationId: 1, uploadedBy: 1 });
attachmentSchema.index({ messageId: 1, status: 1 });

const Attachment = mongoose.model("Attachment", attachmentSchema);
export default Attachment;
