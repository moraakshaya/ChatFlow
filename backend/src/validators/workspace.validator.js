import { body } from "express-validator";

export const createWorkspaceValidator = [
    body("projectId")
        .notEmpty().withMessage("Project ID is required")
        .isMongoId().withMessage("Invalid Project ID format"),
    body("name")
        .trim()
        .notEmpty().withMessage("Workspace name is required")
        .isString().withMessage("Name must be a string")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("code")
        .trim()
        .notEmpty().withMessage("Workspace code is required")
        .isString().withMessage("Code must be a string")
        .isUppercase().withMessage("Code must be uppercase"),
    body("status")
        .optional()
        .isIn(["active", "inactive"]).withMessage("Status must be either active or inactive"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .trim()
        .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];

export const updateWorkspaceValidator = [
    body("name")
        .optional()
        .trim()
        .notEmpty().withMessage("Workspace name cannot be empty")
        .isString().withMessage("Name must be a string")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("status")
        .optional()
        .isIn(["active", "inactive"]).withMessage("Status must be either active or inactive"),
    body("icon")
        .optional()
        .isString().withMessage("Icon must be a string"),
    body("color")
        .optional()
        .isString().withMessage("Color must be a string"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .trim()
        .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];
