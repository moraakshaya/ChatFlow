import mongoose from "mongoose";
import Project from "../models/Project.js";
import Workspace from "../models/Workspace.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";

class AuthorizationService {
    /**
     * Checks if a user has access to a project.
     * Requires the project to belong to the user's organization.
     */
    async checkProjectAccess(userId, organizationId, projectId) {
        const project = await Project.findOne({
            _id: projectId,
            organizationId,
            isDeleted: false
        });
        return !!project;
    }

    /**
     * Checks if a user has access to a workspace.
     * Requires the workspace to belong to a project they can access.
     */
    async checkWorkspaceAccess(userId, organizationId, workspaceId) {
        const workspace = await Workspace.findOne({
            _id: workspaceId,
            isDeleted: false
        });

        if (!workspace) return false;

        return this.checkProjectAccess(userId, organizationId, workspace.projectId);
    }

    /**
     * Checks if a user is an active member of a conversation.
     * (Membership-based authorization)
     */
    async checkConversationMembership(userId, conversationId) {
        const membership = await ConversationMember.findOne({
            conversationId,
            userId,
            status: "active"
        });
        return !!membership;
    }

    /**
     * Checks if a user can manage a conversation (e.g., delete it, update it).
     * Currently restricted to the conversation owner.
     */
    async checkConversationManagement(userId, conversationId) {
        const membership = await ConversationMember.findOne({
            conversationId,
            userId,
            status: "active"
        });
        
        return membership && (membership.role === "owner" || membership.role === "admin");
    }

    /**
     * Checks if a user is the owner of a conversation.
     */
    async checkConversationOwnership(userId, conversationId) {
        const membership = await ConversationMember.findOne({
            conversationId,
            userId,
            status: "active"
        });
        
        return membership && membership.role === "owner";
    }

    /**
     * Checks if a user can manage members of a conversation.
     */
    async checkMemberManagement(userId, conversationId) {
        const membership = await ConversationMember.findOne({
            conversationId,
            userId,
            status: "active"
        });
        
        return membership && (membership.role === "owner" || membership.role === "admin");
    }

    /**
     * Checks if a user is the author of a message.
     */
    async checkMessageAuthor(userId, messageId) {
        const message = await Message.findById(messageId);
        if (!message) return false;
        
        return message.senderId.toString() === userId.toString();
    }

    /**
     * Checks if a user can access a message.
     * True if the user is a member of the conversation the message belongs to.
     */
    async checkMessageAccess(userId, messageId) {
        const message = await Message.findById(messageId);
        if (!message) return false;

        return this.checkConversationMembership(userId, message.conversationId);
    }
}

export const authorizationService = new AuthorizationService();
