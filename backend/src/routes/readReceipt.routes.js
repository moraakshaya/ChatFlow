import express from "express";
import {
    markMessagesAsRead,
    getLastReadMessage,
    getUnreadCount
} from "../controllers/readReceipt.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect); // Require auth

router.route("/read")
    .post(markMessagesAsRead);

router.route("/conversation/:conversationId/last-read")
    .get(getLastReadMessage);

router.route("/conversation/:conversationId/unread-count")
    .get(getUnreadCount);

export default router;
