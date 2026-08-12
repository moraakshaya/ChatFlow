/**
 * Middleware to enforce required permission scopes for Public API requests.
 * @param {string} requiredScope - e.g., 'messages:write', 'conversations:read'
 */
export const requireScope = (requiredScope) => {
    return (req, res, next) => {
        if (!req.apiContext || !req.apiContext.scopes) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Integration context missing'
                }
            });
        }

        const { scopes } = req.apiContext;

        if (scopes.includes('*') || scopes.includes(requiredScope)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: `Missing required scope: ${requiredScope}`
            }
        });
    };
};
