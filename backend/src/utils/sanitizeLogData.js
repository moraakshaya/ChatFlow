const SENSITIVE_KEYS = [
    "password",
    "passwordhash",
    "accesstoken",
    "refreshtoken",
    "authorization",
    "secret",
    "cookie"
];

const REDACTED_STRING = "[REDACTED]";

/**
 * Recursively sanitizes an object by redacting sensitive keys.
 * 
 * @param {any} data - The data to sanitize
 * @returns {any} A sanitized copy of the data
 */
export const sanitizeLogData = (data) => {
    // If it's not an object or is null, return it as is
    if (data === null || typeof data !== "object") {
        return data;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => sanitizeLogData(item));
    }

    // Handle objects
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            sanitized[key] = REDACTED_STRING;
        } else {
            sanitized[key] = sanitizeLogData(value);
        }
    }

    return sanitized;
};
