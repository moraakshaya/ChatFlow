import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        entity: {
            type: String,
            required: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        metadata: {
            type: Object,
            default: {},
        },
    },
    { timestamps: true }
);

// Index for faster queries
activityLogSchema.index({ organizationId: 1, createdAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);
