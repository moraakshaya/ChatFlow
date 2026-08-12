import mongoose from "mongoose";

/**
 * Validates a socket payload against simple rules.
 * Emits message:error and returns false if validation fails.
 * Returns true if valid.
 * 
 * Rules format:
 * {
 *   field: { required: true, type: "string" | "objectId" | "boolean", maxLength?: number, enum?: string[] }
 * }
 */
export const validateSocketPayload = (socket, payload, rules) => {
    if (!payload || typeof payload !== "object") {
        socket.emit("message:error", {
            code: "VALIDATION_ERROR",
            message: "Invalid payload format",
            errors: [{ field: "payload", message: "Payload must be an object" }]
        });
        return false;
    }

    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        const value = payload[field];

        if (rule.required && (value === undefined || value === null || value === "")) {
            errors.push({ field, message: `${field} is required` });
            continue;
        }

        if (value !== undefined && value !== null) {
            if (rule.type === "objectId" && !mongoose.Types.ObjectId.isValid(value)) {
                errors.push({ field, message: `Invalid ${field} format` });
            }
            if (rule.type === "string" && typeof value !== "string") {
                errors.push({ field, message: `${field} must be a string` });
            }
            if (rule.type === "boolean" && typeof value !== "boolean") {
                errors.push({ field, message: `${field} must be a boolean` });
            }
            if (rule.maxLength && typeof value === "string" && value.length > rule.maxLength) {
                errors.push({ field, message: `${field} cannot exceed ${rule.maxLength} characters` });
            }
            if (rule.enum && !rule.enum.includes(value)) {
                errors.push({ field, message: `${field} must be one of: ${rule.enum.join(", ")}` });
            }
        }
    }

    if (errors.length > 0) {
        socket.emit("message:error", {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            errors
        });
        return false;
    }

    return true;
};
