import { notificationService } from "../services/notification.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page, limit, isRead } = req.query;

    const result = await notificationService.getUserNotifications(userId, { page, limit, isRead });

    res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: result.pagination
    });
});

// @desc    Get a single notification
// @route   GET /api/notifications/:id
// @access  Private
export const getNotificationById = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const notification = await notificationService.getNotificationById(id, userId);

    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({
        success: true,
        data: notification
    });
});

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const notification = await notificationService.markAsRead(id, userId);

    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({
        success: true,
        message: "Notification marked as read"
    });
});

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
        success: true,
        message: "All notifications marked as read"
    });
});

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { id } = req.params;

    const notification = await notificationService.deleteNotification(id, userId);

    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({
        success: true,
        message: "Notification deleted successfully"
    });
});
