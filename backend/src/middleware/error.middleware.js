import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";
import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
    // If response already started, delegate to default express error handler
    if (res.headersSent) {
        logger.error({ event: "request.error", error: err, requestId: req.requestId }, "Error after headers sent");
        return next(err);
    }

    let error = err;

    // Handle Mongoose Duplicate Key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const message = `A resource with these details already exists: ${field}`;
        error = new AppError(message, 409, ERROR_CODES.DUPLICATE_RESOURCE);
    }

    // Handle Mongoose Validation Error
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors).map(val => ({ field: val.path, message: val.message }));
        error = new AppError("Validation failed", 422, ERROR_CODES.VALIDATION_ERROR, errors);
    }

    // Handle Mongoose CastError (Bad ObjectId)
    if (err.name === "CastError") {
        error = new AppError("Invalid resource ID", 400, ERROR_CODES.INVALID_ID);
    }

    // Handle generic syntax errors (e.g., bad JSON in body)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        error = new AppError("Invalid request format", 400, ERROR_CODES.BAD_REQUEST);
    }

    // Fallback if it's not an AppError
    if (!(error instanceof AppError)) {
        logger.error({ event: "request.error", error, requestId: req.requestId }, "Unhandled Error");
        error = new AppError(
            "Something went wrong",
            error.statusCode || 500,
            ERROR_CODES.INTERNAL_SERVER_ERROR
        );
    } else if (error.statusCode >= 500) {
        logger.error({ event: "request.error", code: error.code, message: error.message, requestId: req.requestId }, "Application Error");
    }

    // Construct response
    const response = {
        success: false,
        error: {
            code: error.code,
            message: error.message
        }
    };

    if (error.details) {
        response.error.details = error.details;
    }

    // Include Request ID if available
    if (req.requestId) {
        response.requestId = req.requestId;
    }

    // Include stack trace only in development and if it's not a safe operational error without a stack
    if (process.env.NODE_ENV !== "production") {
        response.error.stack = err.stack;
    }

    res.status(error.statusCode).json(response);
};

export default errorHandler;
