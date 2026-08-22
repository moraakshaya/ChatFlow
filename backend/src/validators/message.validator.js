import { body } from "express-validator";

export const createMessageValidator = [
    body("conversationId")
        .notEmpty().withMessage("Conversation ID is required")
        .isMongoId().withMessage("Invalid Conversation ID format"),
    body("type")
        .isIn(["text", "attachment", "system"]).withMessage("Invalid message type"),
    body("content")
        .if(body("type").equals("text"))
        .trim()
        .notEmpty().withMessage("Message content is required")
        .isString().withMessage("Message content must be a string")
        .isLength({ max: 5000 }).withMessage("Message cannot exceed 5000 characters"),
    body("replyTo")
        .optional()
        .isMongoId().withMessage("Invalid replyTo message ID format"),
    body("attachments")
        .optional()
        .isArray().withMessage("Attachments must be an array")
];
