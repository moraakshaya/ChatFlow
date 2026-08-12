import { apiKeyService } from "../services/apiKey.service.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import logger from '../utils/logger.js';

/**
 * API Authentication Middleware for Public API.
 * Validates the API key (Bearer token or X-API-Key) against stored hashes, OR
 * validates a Widget JWT token for browser-based widget requests.
 */
export const apiAuthentication = async (req, res, next) => {
    let tokenStr;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        tokenStr = req.headers.authorization.split(' ')[1];
    } else if (req.headers['x-api-key']) {
        tokenStr = req.headers['x-api-key'];
    }

    if (!tokenStr) {
        return res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'API key or token is missing'
            }
        });
    }

    // Attempt to parse as JWT first (for widgets)
    // A JWT has 3 parts separated by dots. An API key from our system starts with 'pk_' or 'sk_'.
    if (tokenStr.startsWith('pk_') || tokenStr.startsWith('sk_') || !tokenStr.includes('.')) {
        // It's an API Key
        try {
            const authContext = await apiKeyService.authenticateKey(tokenStr);
            req.apiContext = authContext;
            return next();
        } catch (err) {
            logger.warn({ event: 'public_api.auth_failed', error: err.message });
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_API_KEY',
                    message: 'Invalid API key'
                }
            });
        }
    } else {
        // It's likely a Widget JWT
        try {
            const decoded = jwt.verify(tokenStr, process.env.JWT_ACCESS_SECRET);
            
            if (!decoded.isWidgetContext) {
                throw new Error("Not a valid widget token");
            }

            const user = await User.findOne({ _id: decoded.id, isDeleted: false });
            if (!user) {
                throw new Error("User not found");
            }

            // Set context identical to what public controllers expect
            req.apiContext = {
                organizationId: decoded.organizationId,
                projectId: decoded.projectId,
                type: 'widget'
            };
            req.user = user;
            return next();

        } catch (err) {
            logger.warn({ event: 'widget_api.auth_failed', error: err.message });
            return res.status(401).json({
                success: false,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired widget token'
                }
            });
        }
    }
};
