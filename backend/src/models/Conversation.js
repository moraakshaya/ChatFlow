import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        workspaceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        type: {
            type: String,
            enum: ["private", "group", "channel"],
            required: true,
        },
        name: {
            type: String,
            trim: true,
            validate: {
                validator: function (v) {
                    if (this.type === "group" || this.type === "channel") {
                        return v && v.length >= 2 && v.length <= 100;
                    }
                    return true;
                },
                message: "Name is required for group and channel conversations and must be between 2 and 100 characters.",
            },
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        icon: {
            type: String,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        directKey: {
            type: String,
        },
        lastMessageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message", // This model will be created later
            default: null,
        },
        lastMessageAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "archived"],
            default: "active",
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

// General index for fast workspace filtering
conversationSchema.index({ workspaceId: 1, isDeleted: 1 });

// Ensure channel names are unique within a workspace for active channels
conversationSchema.index(
    { workspaceId: 1, type: 1, name: 1 },
    {
        unique: true,
        partialFilterExpression: {
            type: "channel",
            isDeleted: false,
        },
    }
);

// Ensure only one active direct conversation exists between the same two users
conversationSchema.index(
    { directKey: 1 },
    {
        unique: true,
        partialFilterExpression: {
            type: "private",
            isDeleted: false,
            directKey: { $exists: true, $type: "string" },
        },
    }
);

const Conversation = mongoose.model("Conversation", conversationSchema);
export default Conversation;
