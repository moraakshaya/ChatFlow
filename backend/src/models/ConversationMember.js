import mongoose from "mongoose";

const conversationMemberSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["owner", "admin", "member"],
            required: true,
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        isMuted: {
            type: Boolean,
            default: false,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        lastReadMessageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message", // To be implemented in next module
            default: null,
        },
        lastReadAt: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "left", "removed"],
            default: "active",
        },
        leftAt: {
            type: Date,
            default: null,
        },
        removedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Unique index to prevent multiple membership documents for the same conversation-user pair
conversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

const ConversationMember = mongoose.model("ConversationMember", conversationMemberSchema);
export default ConversationMember;
