import express from "express";
import {
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All message routes require authentication
router.use(protect);

router.route("/")
    .post(sendMessage);

router.route("/:conversationId")
    .get(getMessages);

router.route("/:messageId")
    .patch(editMessage)
    .delete(deleteMessage);

export default router;
