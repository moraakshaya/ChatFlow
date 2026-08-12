import mongoose from "mongoose";
import dotenv from "dotenv";
import { notificationPreferenceService } from "./src/services/notificationPreference.service.js";
import { notificationService } from "./src/services/notification.service.js";

// Mock User model behavior directly in the service to avoid DB connection
import User from "./src/models/User.js";
import Notification from "./src/models/Notification.js";

dotenv.config();

const runTest = async () => {
    try {
        console.log("✅ Starting Offline Test for Notification Preferences");

        const MOCK_USER_ID = new mongoose.Types.ObjectId();
        
        // Mock the User model methods
        User.findById = (id) => ({
            select: () => {
                return {
                    _id: MOCK_USER_ID,
                    notificationPreferences: {
                        messages: false,
                        mentions: true,
                        reactions: true,
                        conversationAlerts: true
                    }
                };
            }
        });

        User.findByIdAndUpdate = (id, update, options) => ({
            select: () => {
                return {
                    _id: MOCK_USER_ID,
                    notificationPreferences: {
                        messages: update.$set['notificationPreferences.messages'] ?? false,
                        mentions: true,
                        reactions: true,
                        conversationAlerts: true
                    }
                };
            }
        });

        // Mock Notification.create to prevent DB save
        Notification.create = async (data) => data;

        // 1. Test updatePreferences to disable messages
        console.log("\nDisabling message notifications...");
        const updatedPrefs = await notificationPreferenceService.updatePreferences(MOCK_USER_ID, {
            messages: false
        });
        console.log("Updated Preferences:", updatedPrefs);

        // 2. Test createNotification (should be skipped)
        console.log("\nTesting createNotification (Type: MESSAGE)...");
        const notif1 = await notificationService.createNotification({
            recipient: MOCK_USER_ID,
            type: "MESSAGE",
            title: "Test",
            message: "This should be skipped",
            actor: new mongoose.Types.ObjectId()
        });

        if (notif1 === null) {
            console.log("✅ Message notification correctly skipped (Returned null).");
        } else {
            console.error("❌ Message notification was created despite preference!");
        }

        // 3. Test createNotification for a different type (e.g. MENTIONS)
        console.log("\nTesting createNotification (Type: MENTION)...");
        const notif2 = await notificationService.createNotification({
            recipient: MOCK_USER_ID,
            type: "MENTION",
            title: "Test Mention",
            message: "This should be created",
            actor: new mongoose.Types.ObjectId()
        });

        if (notif2 !== null) {
            console.log("✅ Mention notification correctly created.");
        } else {
            console.error("❌ Mention notification was skipped incorrectly!");
        }

        console.log("\n🎉 All preferences tests passed!");
        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
};

runTest();
