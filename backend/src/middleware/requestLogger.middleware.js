import logger from "../utils/logger.js";

/**
 * Middleware that logs HTTP requests.
 * It measures request duration and logs upon request completion.
 */
export const requestLoggerMiddleware = (req, res, next) => {
    const startTime = Date.now();

    // Log the request upon completion
    res.on("finish", () => {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Choose appropriate log level based on status code
        let level = "info";
        if (statusCode >= 400 && statusCode < 500) {
            level = "warn";
        } else if (statusCode >= 500) {
            level = "error";
        }

        logger[level]({
            event: "http.request",
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode,
            durationMs,
            requestId: req.requestId,
            userId: req.user?._id?.toString() // Extracted if user is authenticated
        });
    });

    next();
};
