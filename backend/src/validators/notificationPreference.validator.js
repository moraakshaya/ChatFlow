import { body, checkExact } from "express-validator";

export const updatePreferencesValidator = checkExact([
    body("messages")
        .optional()
        .isBoolean().withMessage("Preference 'messages' must be a boolean"),
    body("mentions")
        .optional()
        .isBoolean().withMessage("Preference 'mentions' must be a boolean"),
    body("reactions")
        .optional()
        .isBoolean().withMessage("Preference 'reactions' must be a boolean"),
    body("conversationAlerts")
        .optional()
        .isBoolean().withMessage("Preference 'conversationAlerts' must be a boolean")
], { message: "Unknown preference field" });
