import mongoose from "mongoose";

const messageReactionSchema = new mongoose.Schema(
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
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        reaction: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Enforce one user + one message + one reaction = one record
messageReactionSchema.index(
    { messageId: 1, userId: 1, reaction: 1 },
    { unique: true }
);

// Optimize reaction aggregation queries by message
messageReactionSchema.index({ messageId: 1, reaction: 1 });

const MessageReaction = mongoose.model("MessageReaction", messageReactionSchema);
export default MessageReaction;
