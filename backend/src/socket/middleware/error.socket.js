import AppError from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
import logger from "../../utils/logger.js";
import EVENTS from "../events.js";

/**
 * Standardizes any error into the format expected by Socket.IO clients.
 */
export const formatSocketError = (err) => {
    let error = err;

    // Convert generic string errors to AppError
    if (typeof err === "string") {
        error = new AppError(err, 400, ERROR_CODES.BAD_REQUEST);
    }

    // Handle generic JS Errors or unhandled exceptions
    if (!(error instanceof AppError)) {
        logger.error({ event: "socket.event_error", socketId: socket.id, error }, "Unhandled Socket Error");
        error = new AppError("Internal server error", 500, ERROR_CODES.INTERNAL_SERVER_ERROR);
    } else if (error.statusCode >= 500) {
        logger.error({ event: "socket.event_error", socketId: socket.id, code: error.code, message: error.message }, "Socket Application Error");
    }

    const formattedError = {
        success: false,
        error: {
            code: error.code,
            message: error.message
        }
    };

    if (error.details) {
        formattedError.error.details = error.details;
    }

    return formattedError;
};

/**
 * Handles socket errors by either acknowledging a callback or emitting a chat:error event.
 *
 * @param {Socket} socket - The Socket.IO socket instance
 * @param {Error|String} err - The error to handle
 * @param {Function} [callback] - The optional acknowledgement callback
 */
export const handleSocketError = (socket, err, callback) => {
    const formattedError = formatSocketError(err);

    if (typeof callback === "function") {
        // Send acknowledgement
        callback(formattedError);
    } else {
        // Broadcast server-originated error to specific socket
        socket.emit(EVENTS.ERROR, formattedError);
    }
};
