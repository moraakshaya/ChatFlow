import mongoose from "mongoose";
import ConversationMember from "../models/ConversationMember.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import escapeRegex from "../utils/escapeRegex.js";

class MessageSearchService {
    
    /**
     * Resolves the list of conversation IDs that the user is authorized to access 
     * based on their current active memberships and the provided filters.
     * 
     * @param {string} userId - The authenticated user's ID
     * @param {Object} filters - Search filters (conversationId, workspaceId, projectId, organizationId)
     * @returns {Array<ObjectId>} Array of authorized conversation ObjectIds
     */
    async resolveAccessibleConversations(userId, filters) {
        const matchQuery = {
            userId: mongoose.Types.ObjectId.createFromHexString(userId.toString()),
            status: "active"
        };

        if (filters.conversationId) {
            matchQuery.conversationId = mongoose.Types.ObjectId.createFromHexString(filters.conversationId);
        }

        // We join with conversations to filter by higher-level scopes
        const pipeline = [
            { $match: matchQuery },
            {
                $lookup: {
                    from: "conversations",
                    localField: "conversationId",
                    foreignField: "_id",
                    as: "conversation"
                }
            },
            { $unwind: "$conversation" }
        ];

        // Apply additional scope filters if provided
        const conversationMatch = {};
        if (filters.workspaceId) {
            conversationMatch["conversation.workspaceId"] = mongoose.Types.ObjectId.createFromHexString(filters.workspaceId);
        }
        if (filters.projectId) {
            conversationMatch["conversation.projectId"] = mongoose.Types.ObjectId.createFromHexString(filters.projectId);
        }
        // Always enforce organization isolation if organizationId is in scope/filters
        // Assuming global search inherently means within the user's active context.
        if (filters.organizationId) {
            conversationMatch["conversation.organizationId"] = mongoose.Types.ObjectId.createFromHexString(filters.organizationId);
        }

        if (Object.keys(conversationMatch).length > 0) {
            pipeline.push({ $match: conversationMatch });
        }

        pipeline.push({
            $project: {
                _id: 0,
                conversationId: 1
            }
        });

        const memberships = await ConversationMember.aggregate(pipeline);
        return memberships.map(m => m.conversationId);
    }

    /**
     * Core search function.
     * 
     * @param {Object} params - User ID, Organization ID context, filters, and pagination
     * @returns {Object} Paginated search results
     */
    async search({ userId, organizationId, filters }) {
        // 1. Resolve authorized scope boundaries
        const scopeFilters = { ...filters, organizationId };
        const accessibleConversationIds = await this.resolveAccessibleConversations(userId, scopeFilters);

        if (accessibleConversationIds.length === 0) {
            return {
                messages: [],
                pagination: { page: filters.page || 1, limit: filters.limit || 20, total: 0, totalPages: 0 }
            };
        }

        // 2. Build the bounded message query
        const query = {
            conversationId: { $in: accessibleConversationIds },
            isDeleted: false // Never return soft-deleted messages in search
        };

        // Text search
        if (filters.q) {
            const escapedSearchTerm = escapeRegex(filters.q);
            query.content = {
                $regex: escapedSearchTerm,
                $options: "i"
            };
        }

        // Sender filter
        if (filters.senderId) {
            query.senderId = mongoose.Types.ObjectId.createFromHexString(filters.senderId);
        }

        // Message Type filter
        if (filters.messageType) {
            query.messageType = filters.messageType;
        }

        // Date range filter
        if (filters.from || filters.to) {
            query.createdAt = {};
            if (filters.from) query.createdAt.$gte = new Date(filters.from);
            if (filters.to) query.createdAt.$lte = new Date(filters.to);
        }

        // System messages are excluded by default
        if (filters.includeSystemMessages !== 'true' && filters.includeSystemMessages !== true) {
            query.messageType = query.messageType || { $ne: 'system' };
        }

        // Pagination
        const page = parseInt(filters.page, 10) || 1;
        const limit = parseInt(filters.limit, 10) || 20;
        const skip = (page - 1) * limit;

        // 3. Attachment filtering & Message Retrieval via Aggregation
        const pipeline = [
            { $match: query }
        ];

        // If filtering by attachment existence
        if (filters.hasAttachment !== undefined) {
            const hasAtt = filters.hasAttachment === 'true' || filters.hasAttachment === true;
            
            // Join with attachments collection
            pipeline.push({
                $lookup: {
                    from: "attachments",
                    localField: "_id",
                    foreignField: "messageId",
                    pipeline: [
                        { $match: { isDeleted: false, status: "linked" } },
                        { $limit: 1 } // We just need to know if at least one exists
                    ],
                    as: "linkedAttachments"
                }
            });

            // Filter based on the boolean
            if (hasAtt) {
                pipeline.push({ $match: { "linkedAttachments.0": { $exists: true } } });
            } else {
                pipeline.push({ $match: { "linkedAttachments.0": { $exists: false } } });
            }
        }

        // Create a separate pipeline for counting total matches
        const countPipeline = [...pipeline, { $count: "total" }];
        
        // Add sorting and pagination to the main pipeline
        pipeline.push(
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    messageId: "$_id",
                    conversationId: 1,
                    senderId: 1,
                    content: 1,
                    messageType: 1,
                    createdAt: 1,
                    // If we did the attachment lookup, we can map it to a boolean
                    hasAttachment: { 
                        $cond: { 
                            if: { $isArray: "$linkedAttachments" }, 
                            then: { $gt: [{ $size: "$linkedAttachments" }, 0] }, 
                            else: "$$REMOVE" 
                        } 
                    }
                }
            }
        );

        // Execute in parallel
        const [messages, countResult] = await Promise.all([
            Message.aggregate(pipeline),
            Message.aggregate(countPipeline)
        ]);

        const total = countResult.length > 0 ? countResult[0].total : 0;
        const totalPages = Math.ceil(total / limit);

        return {
            messages,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        };
    }
}

export default new MessageSearchService();
