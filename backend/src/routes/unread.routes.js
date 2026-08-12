import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
    getAllUnreadCounts,
    getTotalUnreadCount,
    getConversationUnreadCount,
    markConversationAsRead
} from "../controllers/unread.controller.js";

const router = express.Router();

router.use(protect); // All unread routes require authentication

// Note: Mounted at /api/conversations
router.get("/unread", getAllUnreadCounts);
router.get("/unread/total", getTotalUnreadCount);
router.get("/:conversationId/unread", getConversationUnreadCount);
router.patch("/:conversationId/read", markConversationAsRead);

export default router;
