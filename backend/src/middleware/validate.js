import { validationResult } from "express-validator";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";

/**
 * Middleware that runs the express-validator checks and formats the errors.
 * If validation fails, it throws a VALIDATION_ERROR AppError.
 * 
 * @param {Array} validationRules - Array of express-validator rules
 * @returns {Array} Middleware array (rules + error formatter)
 */
export const validate = (validationRules) => {
    return [
        ...validationRules,
        (req, res, next) => {
            const errors = validationResult(req);
            
            if (errors.isEmpty()) {
                return next();
            }

            const formattedErrors = errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }));

            return next(new AppError("Validation failed", 422, ERROR_CODES.VALIDATION_ERROR, formattedErrors));
        }
    ];
};
