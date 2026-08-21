import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, required: true },
    },
    { _id: false }
);

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        clientMessageId: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ["text", "attachment", "system"],
            required: true,
        },
        content: {
            type: String,
            maxlength: 4000,
            required: function () {
                return this.type === "text" && !this.isDeleted;
            },
        },
        attachments: {
            type: [attachmentSchema],
            validate: [
                {
                    validator: function (val) {
                        return val.length <= 10;
                    },
                    message: "Cannot exceed 10 attachments per message",
                },
            ],
            default: undefined,
        },
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
            default: null,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Idempotency check: prevent duplicate requests from retries
messageSchema.index(
    { senderId: 1, clientMessageId: 1 },
    { unique: true, partialFilterExpression: { clientMessageId: { $type: "string" } } }
);

// Optimizes conversation message loading
messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
