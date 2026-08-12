import { notificationPreferenceService } from "../services/notificationPreference.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// @desc    Get current user's notification preferences
// @route   GET /api/users/me/notification-preferences
// @access  Private
export const getPreferences = asyncHandler(async (req, res) => {
    const preferences = await notificationPreferenceService.getPreferences(req.user._id);

    res.status(200).json({
        success: true,
        data: preferences
    });
});

// @desc    Update current user's notification preferences
// @route   PATCH /api/users/me/notification-preferences
// @access  Private
export const updatePreferences = asyncHandler(async (req, res, next) => {
    try {
        const updatedPreferences = await notificationPreferenceService.updatePreferences(req.user._id, req.body);

        res.status(200).json({
            success: true,
            message: "Notification preferences updated",
            data: updatedPreferences
        });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
    }
});
