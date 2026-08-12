import { body } from "express-validator";

export const createOrganizationValidator = [
    body("name")
        .trim()
        .notEmpty().withMessage("Organization name is required")
        .isString().withMessage("Name must be a string")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .trim()
        .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];

export const updateOrganizationValidator = [
    body("name")
        .optional()
        .trim()
        .notEmpty().withMessage("Organization name cannot be empty")
        .isString().withMessage("Name must be a string")
        .isLength({ max: 100 }).withMessage("Name cannot exceed 100 characters"),
    body("description")
        .optional()
        .isString().withMessage("Description must be a string")
        .trim()
        .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];
