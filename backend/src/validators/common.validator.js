import { body, param, query } from "express-validator";
import mongoose from "mongoose";

/**
 * Helper to validate if a string is a valid MongoDB ObjectId.
 * @param {String} value 
 * @returns {Boolean}
 */
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

/**
 * Reusable validation rule for ObjectIds in route parameters
 * @param {String} paramName 
 */
export const validateParamId = (paramName = "id") => {
    return param(paramName)
        .custom(isValidObjectId)
        .withMessage(`Invalid ${paramName}`);
};

/**
 * Reusable validation rule for ObjectIds in request body
 * @param {String} fieldName 
 */
export const validateBodyObjectId = (fieldName) => {
    return body(fieldName)
        .notEmpty()
        .withMessage(`${fieldName} is required`)
        .custom(isValidObjectId)
        .withMessage(`Invalid ${fieldName}`);
};

/**
 * Reusable validation for pagination query parameters
 */
export const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("page must be a positive integer"),
    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("limit must be a positive integer between 1 and 100")
];

/**
 * Reusable validation for search query
 * @param {String} fieldName 
 * @param {Number} maxLength 
 */
export const validateSearchQuery = (fieldName = "q", maxLength = 100) => {
    return query(fieldName)
        .optional()
        .isString()
        .withMessage(`${fieldName} must be a string`)
        .trim()
        .isLength({ max: maxLength })
        .withMessage(`${fieldName} cannot exceed ${maxLength} characters`);
};
