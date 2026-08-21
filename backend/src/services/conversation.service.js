import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Workspace from "../models/Workspace.js";
import Project from "../models/Project.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

class ConversationService {
    async createConversation(data) {
        const {
            workspaceId,
            projectId,
            organizationId,
            type,
            name,
            description,
            icon,
            directKey,
            createdBy // userId
        } = data;

        const workspace = await Workspace.findOne({
            _id: workspaceId,
            projectId,
            isDeleted: false,
            status: "active"
        });

        if (!workspace) {
            throw new AppError("Workspace not found or invalid hierarchy", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        const project = await Project.findOne({
            _id: projectId,
            organizationId,
            isDeleted: false,
            status: "active"
        });

        if (!project) {
            throw new AppError("Project not found or invalid hierarchy", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        if (type === "private" && !directKey) {
            throw new AppError("directKey is required for private conversations", 400, ERROR_CODES.VALIDATION_ERROR);
        }

        const conversationData = {
            workspaceId,
            projectId,
            organizationId,
            type,
            name: type === "private" ? undefined : name,
            description,
            icon,
            directKey: type === "private" ? directKey : undefined,
            createdBy
        };

        const conversation = await Conversation.create(conversationData);

        // Automatically add the creator as the owner
        await ConversationMember.create({
            conversationId: conversation._id,
            userId: createdBy,
            role: "owner",
            status: "active",
            joinedAt: new Date()
        });

        return conversation;
    }

    async createDirectConversation(userId, targetUserId, workspaceId, projectId, organizationId) {
        if (!targetUserId || !workspaceId || !projectId) {
            throw new AppError("targetUserId, workspaceId, and projectId are required", 400, ERROR_CODES.VALIDATION_ERROR);
        }

        // Generate consistent directKey (sort IDs alphabetically)
        const directKey = [userId.toString(), targetUserId.toString()].sort().join("_");

        // Check if DM already exists
        let conversation = await Conversation.findOne({ directKey, isDeleted: false });
        
        if (conversation) {
            return conversation;
        }

        // Create new private conversation
        conversation = await Conversation.create({
            workspaceId,
            projectId,
            organizationId,
            type: "private",
            directKey,
            createdBy: userId
        });

        // Add both users as active members
        await ConversationMember.insertMany([
            {
                conversationId: conversation._id,
                userId: userId,
                role: "member",
                status: "active",
                joinedAt: new Date()
            },
            {
                conversationId: conversation._id,
                userId: targetUserId,
                role: "member",
                status: "active",
                joinedAt: new Date()
            }
        ]);

        return conversation;
    }

    async getConversationsForUser(userId, queryParams = {}) {
        const page = parseInt(queryParams.page, 10) || 1;
        const limit = parseInt(queryParams.limit, 10) || 20;
        const actualLimit = limit > 100 ? 100 : limit;
        const startIndex = (page - 1) * actualLimit;

        const memberships = await ConversationMember.find({
            userId,
            status: "active"
        });

        const conversationIds = memberships.map(m => m.conversationId);

        const query = {
            _id: { $in: conversationIds },
            isDeleted: false
        };

        if (queryParams.workspaceId) query.workspaceId = queryParams.workspaceId;
        if (queryParams.projectId) query.projectId = queryParams.projectId;
        if (queryParams.type) query.type = queryParams.type;
        if (queryParams.status) query.status = queryParams.status;

        let conversations = await Conversation.find(query)
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .skip(startIndex)
            .limit(actualLimit)
            .lean(); // Use lean to easily attach targetUser property

        // For private conversations, populate the target user's details
        const privateConvIds = conversations.filter(c => c.type === "private").map(c => c._id);
        
        if (privateConvIds.length > 0) {
            // Find all members in these private conversations
            const privateMembers = await ConversationMember.find({
                conversationId: { $in: privateConvIds },
                status: "active"
            }).populate("userId", "fullName email avatar status isDeleted");

            conversations = conversations.map(conv => {
                if (conv.type === "private") {
                    // Find the member who is NOT the current user
                    const targetMember = privateMembers.find(
                        m => m.conversationId.toString() === conv._id.toString() && 
                             m.userId && 
                             m.userId._id.toString() !== userId.toString()
                    );
                    
                    if (targetMember && targetMember.userId) {
                        conv.targetUser = targetMember.userId;
                    }
                }
                return conv;
            });
        }
        
        const total = await Conversation.countDocuments(query);

        return {
            conversations,
            pagination: {
                page,
                limit: actualLimit,
                total,
                totalPages: Math.ceil(total / actualLimit)
            }
        };
    }

    async getConversationsForProject(projectId, queryParams = {}) {
        const page = parseInt(queryParams.page, 10) || 1;
        const limit = parseInt(queryParams.limit, 10) || 20;
        const actualLimit = limit > 100 ? 100 : limit;
        const startIndex = (page - 1) * actualLimit;

        const query = {
            projectId,
            isDeleted: false
        };

        if (queryParams.workspaceId) query.workspaceId = queryParams.workspaceId;
        if (queryParams.type) query.type = queryParams.type;
        if (queryParams.status) query.status = queryParams.status;

        const conversations = await Conversation.find(query)
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .skip(startIndex)
            .limit(actualLimit);
        
        const total = await Conversation.countDocuments(query);

        return {
            conversations,
            pagination: {
                page,
                limit: actualLimit,
                total,
                totalPages: Math.ceil(total / actualLimit)
            }
        };
    }

    async getConversationById(id, organizationId) {
        const query = { _id: id, isDeleted: false };
        if (organizationId) query.organizationId = organizationId;

        const conversation = await Conversation.findOne(query);

        if (!conversation) {
            throw new AppError("Conversation not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        return conversation;
    }

    async updateConversation(id, organizationId, updates) {
        const conversation = await Conversation.findOneAndUpdate(
            { _id: id, organizationId, isDeleted: false },
            updates,
            { new: true, runValidators: true }
        );

        if (!conversation) {
            throw new AppError("Conversation not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        return conversation;
    }

    async archiveConversation(id, organizationId) {
        return this.updateConversation(id, organizationId, { status: "archived" });
    }

    async unarchiveConversation(id, organizationId) {
        return this.updateConversation(id, organizationId, { status: "active" });
    }

    async deleteConversation(id, organizationId) {
        return this.updateConversation(id, organizationId, { isDeleted: true });
    }
}

export const conversationService = new ConversationService();
