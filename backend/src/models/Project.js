import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
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

// Ensure that project code is unique within a specific organization
projectSchema.index({ organizationId: 1, code: 1 }, { unique: true });
// Ensure that project name is unique within a specific organization
projectSchema.index({ organizationId: 1, name: 1 }, { unique: true });

const Project = mongoose.model("Project", projectSchema);
export default Project;
