import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    getUserNotifications,
    getNotificationById,
    markAsRead,
    markAllAsRead,
    deleteNotification
} from "../controllers/notification.controller.js";

const router = express.Router();

// All notification routes require authentication
router.use(protect);

router.get("/", getUserNotifications);
router.patch("/read-all", markAllAsRead); // Must be before /:id routes
router.get("/:id", getNotificationById);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;
