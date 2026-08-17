import { body } from "express-validator";

export const signupValidator = [
    body("organizationName")
        .trim()
        .notEmpty().withMessage("Organization Name is required")
        .isString().withMessage("Organization Name must be a string"),
    body("fullName")
        .trim()
        .notEmpty().withMessage("Full name is required")
        .isString().withMessage("Full name must be a string")
        .isLength({ max: 50 }).withMessage("Full name cannot exceed 50 characters"),
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Must be a valid email address")
        .normalizeEmail(),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isString().withMessage("Password must be a string")
        .isLength({ min: 6, max: 100 }).withMessage("Password must be between 6 and 100 characters")
];

export const loginValidator = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Must be a valid email address")
        .normalizeEmail(),
    body("password")
        .notEmpty().withMessage("Password is required")
        .isString().withMessage("Password must be a string")
];
