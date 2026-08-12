import Notification from "../models/Notification.js";
import realtimeService from "./realtime.service.js";
import logger from "../utils/logger.js";
import { notificationPreferenceService } from "./notificationPreference.service.js";

class NotificationService {
    /**
     * Creates a new notification, saves it, and emits it real-time.
     * @param {Object} data 
     * @param {String} data.recipient
     * @param {String} data.type
     * @param {String} data.title
     * @param {String} data.message
     * @param {String} [data.actor]
     * @param {String} [data.conversation]
     * @param {String} [data.sourceMessage]
     */
    async createNotification(data) {
        // Prevent self-notifications
        if (data.actor && data.recipient && data.actor.toString() === data.recipient.toString()) {
            return null; // Skip silently
        }

        try {
            // Check User Preferences before creating notification
            const isEnabled = await notificationPreferenceService.isNotificationEnabled(
                data.recipient.toString(),
                data.type
            );

            if (!isEnabled) {
                // Silently skip if user has disabled this notification type
                return null;
            }
            const notification = await Notification.create(data);
            
            // Deliver in real-time if possible, but don't fail if Socket.IO isn't available
            realtimeService.emitNewNotification(data.recipient.toString(), notification);

            return notification;
        } catch (error) {
            logger.error({ event: "notification.create.error", error: error.message }, "Error creating notification");
            throw error;
        }
    }

    /**
     * Gets notifications for a user with pagination and optional isRead filter.
     */
    async getUserNotifications(userId, options = {}) {
        const { page = 1, limit = 20, isRead } = options;
        const query = { recipient: userId };
        
        if (typeof isRead !== "undefined") {
            query.isRead = isRead === "true" || isRead === true;
        }

        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate("actor", "name avatarUrl username"),
            Notification.countDocuments(query)
        ]);

        return {
            notifications,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Retrieves a single notification if the user owns it.
     */
    async getNotificationById(notificationId, userId) {
        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: userId
        }).populate("actor", "name avatarUrl username");
        
        return notification;
    }

    /**
     * Marks a notification as read.
     */
    async markAsRead(notificationId, userId) {
        return Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { $set: { isRead: true } },
            { new: true }
        );
    }

    /**
     * Marks all unread notifications for a user as read.
     */
    async markAllAsRead(userId) {
        return Notification.updateMany(
            { recipient: userId, isRead: false },
            { $set: { isRead: true } }
        );
    }

    /**
     * Deletes a specific notification.
     */
    async deleteNotification(notificationId, userId) {
        return Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });
    }
}

export const notificationService = new NotificationService();
