import crypto from "crypto";

/**
 * Middleware that ensures every request has a unique ID.
 * It checks for an existing X-Request-ID header, and if absent, generates one.
 * The ID is attached to the request object and returned in the response headers.
 */
export const requestIdMiddleware = (req, res, next) => {
    // Look for existing request ID or generate a new one
    const reqId = req.headers["x-request-id"] || `req_${crypto.randomBytes(16).toString("hex")}`;
    
    // Attach to request object for use in controllers/services
    req.requestId = reqId;

    // Set header on the response
    res.setHeader("X-Request-ID", reqId);

    next();
};
