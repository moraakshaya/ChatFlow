import mongoose from "mongoose";

const readReceiptSchema = new mongoose.Schema(
    {
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
        status: {
            type: String,
            enum: ["delivered", "read"],
            required: true,
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
        readAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Enforce one receipt document per user per message
readReceiptSchema.index(
    { messageId: 1, userId: 1 },
    { unique: true }
);

// Optimize querying receipts for a conversation per user (used for unread counts)
readReceiptSchema.index(
    { conversationId: 1, userId: 1, status: 1 }
);

const ReadReceipt = mongoose.model("ReadReceipt", readReceiptSchema);
export default ReadReceipt;
