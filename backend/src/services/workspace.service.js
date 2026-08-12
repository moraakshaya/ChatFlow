import Workspace from "../models/Workspace.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

class WorkspaceService {
    async createWorkspace(workspaceData) {
        const { projectId, name, code } = workspaceData;

        // Check name uniqueness within project
        const existingName = await Workspace.findOne({ projectId, name: { $regex: new RegExp(`^${name}$`, 'i') }, isDeleted: false });
        if (existingName) {
            throw new AppError("Workspace name already exists in this project", 400, ERROR_CODES.VALIDATION_ERROR);
        }

        // Check code uniqueness within project
        const existingCode = await Workspace.findOne({ projectId, code: { $regex: new RegExp(`^${code}$`, 'i') }, isDeleted: false });
        if (existingCode) {
            throw new AppError("Workspace code already exists in this project", 409, ERROR_CODES.CONFLICT);
        }

        const workspace = await Workspace.create(workspaceData);
        return workspace;
    }

    async getWorkspaces(query, pagination) {
        const { page = 1, limit = 10 } = pagination;
        const startIndex = (page - 1) * limit;

        const workspaces = await Workspace.find(query)
            .skip(startIndex)
            .limit(limit)
            .lean();

        return workspaces;
    }

    async getWorkspaceById(workspaceId) {
        const workspace = await Workspace.findOne({ _id: workspaceId, isDeleted: false });
        if (!workspace) {
            throw new AppError("Workspace not found", 404, ERROR_CODES.NOT_FOUND);
        }
        return workspace;
    }

    async updateWorkspace(workspaceId, updateData) {
        // Ensure protected fields are not updated
        const { isDeleted, projectId, code, ...allowedUpdates } = updateData;

        const workspace = await Workspace.findOneAndUpdate(
            { _id: workspaceId, isDeleted: false },
            allowedUpdates,
            { new: true, runValidators: true }
        );

        if (!workspace) {
            throw new AppError("Workspace not found", 404, ERROR_CODES.NOT_FOUND);
        }

        return workspace;
    }

    async deleteWorkspace(workspaceId) {
        const workspace = await Workspace.findOneAndUpdate(
            { _id: workspaceId, isDeleted: false },
            { status: "inactive", isDeleted: true },
            { new: true }
        );

        if (!workspace) {
            throw new AppError("Workspace not found", 404, ERROR_CODES.NOT_FOUND);
        }

        return true;
    }
}

export const workspaceService = new WorkspaceService();
