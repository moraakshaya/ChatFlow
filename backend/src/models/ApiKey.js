import mongoose from "mongoose";

const apiKeySchema = new mongoose.Schema(
    {
        keyId: {
            type: String,
            required: true,
            unique: true,
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
        name: {
            type: String,
            required: true,
            trim: true,
        },
        keyPrefix: {
            type: String,
            required: true,
            trim: true,
        },
        keyHash: {
            type: String,
            required: true,
        },
        scopes: [
            {
                type: String,
            },
        ],
        expiresAt: {
            type: Date,
            default: null,
        },
        lastUsedAt: {
            type: Date,
            default: null,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

// Optimize keyId lookups since it's the primary authentication identifier
apiKeySchema.index({ keyId: 1 }, { unique: true });
apiKeySchema.index({ projectId: 1 });
apiKeySchema.index({ organizationId: 1 });

const ApiKey = mongoose.model("ApiKey", apiKeySchema);
export default ApiKey;
