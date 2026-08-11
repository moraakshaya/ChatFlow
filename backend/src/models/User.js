import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
        },
        avatar: {
            type: String,
            default: null,
        },
        phone: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
        },
        lastSeen: {
            type: Date,
            default: null,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
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

// Unique active email per organization
userSchema.index(
    { organizationId: 1, email: 1 },
    {
        unique: true,
        partialFilterExpression: {
            isDeleted: false
        }
    }
);

userSchema.index({ organizationId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isDeleted: 1 });

const User = mongoose.model("User", userSchema);
export default User;
