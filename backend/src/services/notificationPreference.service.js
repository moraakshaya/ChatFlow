import User from "../models/User.js";

const PREFERENCE_KEYS = ["messages", "mentions", "reactions", "conversationAlerts"];

class NotificationPreferenceService {
    /**
     * Gets the notification preferences for a user.
     * @param {String} userId 
     * @returns {Promise<Object>}
     */
    async getPreferences(userId) {
        const user = await User.findById(userId).select("notificationPreferences");
        if (!user) throw new Error("User not found");
        
        return user.notificationPreferences;
    }

    /**
     * Updates notification preferences for a user.
     * @param {String} userId 
     * @param {Object} updates 
     * @returns {Promise<Object>}
     */
    async updatePreferences(userId, updates) {
        if (!updates || Object.keys(updates).length === 0) {
            const err = new Error("No notification preference was provided for update");
            err.statusCode = 400;
            throw err;
        }

        const validUpdates = {};

        for (const [key, value] of Object.entries(updates)) {
            if (!PREFERENCE_KEYS.includes(key)) {
                const err = new Error(`Unknown preference field: ${key}`);
                err.statusCode = 400;
                throw err;
            }

            if (typeof value !== "boolean") {
                const err = new Error(`Preference '${key}' must be a boolean`);
                err.statusCode = 400;
                throw err;
            }

            validUpdates[`notificationPreferences.${key}`] = value;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: validUpdates },
            { new: true, runValidators: true }
        ).select("notificationPreferences");

        if (!updatedUser) throw new Error("User not found");

        return updatedUser.notificationPreferences;
    }

    /**
     * Checks if a specific notification type is enabled for a user.
     * @param {String} userId 
     * @param {String} notificationType 
     * @returns {Promise<Boolean>}
     */
    async isNotificationEnabled(userId, notificationType) {
        const preferences = await this.getPreferences(userId);

        switch (notificationType) {
            case "MESSAGE":
                return preferences.messages !== false;
            case "MENTION":
                return preferences.mentions !== false;
            case "REACTION":
                return preferences.reactions !== false;
            case "CONVERSATION":
                return preferences.conversationAlerts !== false;
            default:
                return true; // Default to true if type mapping is not explicitly handled
        }
    }
}

export const notificationPreferenceService = new NotificationPreferenceService();
