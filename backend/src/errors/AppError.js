import { ERROR_CODES } from "./errorCodes.js";

/**
 * Standard Application Error
 */
class AppError extends Error {
    constructor(message, statusCode, code, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || ERROR_CODES.INTERNAL_SERVER_ERROR;
        this.details = details;
        this.isOperational = true; // Expected application error

        Error.captureStackTrace(this, this.constructor);
    }
}

export default AppError;
