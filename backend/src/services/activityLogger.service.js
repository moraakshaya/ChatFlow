import ActivityLog from "../models/ActivityLog.js";
import logger from "../utils/logger.js";

/**
 * Logs an activity to the database.
 * 
 * @param {Object} params
 * @param {ObjectId} params.organizationId - ID of the organization
 * @param {ObjectId} params.userId - ID of the user performing the action
 * @param {String} params.action - The action performed (e.g., 'created', 'deleted', 'updated')
 * @param {String} params.entity - The entity type (e.g., 'Project', 'Workspace', 'Message')
 * @param {ObjectId} params.entityId - The ID of the entity
 * @param {Object} params.metadata - Additional contextual data
 */
export const logActivity = async ({ organizationId, userId, action, entity, entityId, metadata = {} }) => {
    try {
        if (!organizationId || !userId || !action || !entity || !entityId) {
            throw new Error("Missing required fields for activity log");
        }

        await ActivityLog.create({
            organizationId,
            userId,
            action,
            entity,
            entityId,
            metadata,
        });
    } catch (error) {
        logger.error(`Failed to log activity: ${error.message}`);
    }
};
