import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
    {
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        icon: {
            type: String,
            default: null,
        },
        color: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
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

// Indexes
workspaceSchema.index({ projectId: 1 });
workspaceSchema.index({ isDeleted: 1 });

// Ensure that workspace code is unique within a specific project
workspaceSchema.index({ projectId: 1, code: 1 }, { unique: true });

// Ensure that workspace name is unique within a specific project
workspaceSchema.index({ projectId: 1, name: 1 }, { unique: true });

const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;
