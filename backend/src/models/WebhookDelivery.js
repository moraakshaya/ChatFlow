import mongoose from "mongoose";

const webhookDeliverySchema = new mongoose.Schema(
    {
        webhookId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Webhook",
            required: true,
        },
        eventId: {
            type: String,
            required: true,
        },
        eventType: {
            type: String,
            required: true,
        },
        eventVersion: {
            type: String,
            default: "v1",
        },
        status: {
            type: String,
            enum: ["pending", "processing", "success", "failed"],
            default: "pending",
        },
        attempt: {
            type: Number,
            default: 0,
        },
        responseStatus: {
            type: Number,
            default: null,
        },
        lastAttemptAt: {
            type: Date,
            default: null,
        },
        nextRetryAt: {
            type: Date,
            default: null,
        },
        failureReason: {
            type: String,
            default: null,
        },
        deliveredAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

webhookDeliverySchema.index({ webhookId: 1, eventId: 1 }, { unique: true });
webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

const WebhookDelivery = mongoose.model("WebhookDelivery", webhookDeliverySchema);
export default WebhookDelivery;
