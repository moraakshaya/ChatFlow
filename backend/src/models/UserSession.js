import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        refreshTokenHash: {
            type: String,
            required: true,
        },
        deviceInfo: {
            type: String,
            default: null,
        },
        ipAddress: {
            type: String,
            default: null,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        lastUsedAt: {
            type: Date,
            default: null,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

userSessionSchema.index({ userId: 1 });
// Automatically remove expired sessions (TTL index)
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UserSession = mongoose.model("UserSession", userSessionSchema);
export default UserSession;
