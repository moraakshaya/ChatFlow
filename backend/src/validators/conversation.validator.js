import { body } from "express-validator";

export const createConversationValidator = [
    body("type")
        .notEmpty().withMessage("Conversation type is required")
        .isIn(["private", "group", "channel"]).withMessage("Type must be private, group, or channel"),
    body("workspaceId")
        .optional()
        .isMongoId().withMessage("Invalid workspace ID format"),
    body("name")
        .optional()
        .trim()
        .notEmpty().withMessage("Name cannot be empty if provided")
        .isString().withMessage("Name must be a string")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("members")
        .isArray({ min: 1 }).withMessage("At least one member is required")
        .custom((members) => {
            if (!members.every((m) => typeof m === "string" && m.length === 24)) {
                throw new Error("Invalid member IDs");
            }
            return true;
        })
];
