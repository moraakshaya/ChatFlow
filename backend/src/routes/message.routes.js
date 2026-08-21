import express from "express";
import {
    sendMessage,
    getMessages,
    deleteMessage
} from "../controllers/message.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import { messageRateLimiter, generalRateLimiter } from "../middleware/rateLimit.middleware.js";
import { validateParamId, validatePagination } from "../validators/common.validator.js";
import { createMessageValidator } from "../validators/message.validator.js";

const router = express.Router();

// All message routes require authentication
router.use(protect);

router.route("/")
    .post(messageRateLimiter, validate(createMessageValidator), sendMessage);

router.route("/conversation/:conversationId")
    .get(validate([validateParamId("conversationId"), ...validatePagination]), getMessages);

router.delete("/:messageId", deleteMessage);

export default router;
