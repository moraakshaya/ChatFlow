import { body } from "express-validator";

export const createProjectValidator = [
    body("organizationId")
        .notEmpty().withMessage("Organization ID is required")
        .isMongoId().withMessage("Invalid Organization ID format"),
    body("name")
        .trim()
        .notEmpty().withMessage("Project name is required")
        .isString().withMessage("Name must be a string")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .trim()
        .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];

export const updateProjectValidator = [
    body("name")
        .optional()
        .trim()
        .notEmpty().withMessage("Project name cannot be empty")
        .isString().withMessage("Name must be a string")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .trim()
        .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
    body("status")
        .optional()
        .isString()
        .isIn(["active", "archived"]).withMessage("Status must be active or archived")
];
