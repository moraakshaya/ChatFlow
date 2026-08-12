import crypto from "crypto";

// The encryption key should be 32 bytes (256 bits) for aes-256-gcm
// Default fallback provided for local development, but in production this must be in .env
const ENCRYPTION_KEY = process.env.WEBHOOK_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef"; // 32 characters = 32 bytes
const ALGORITHM = "aes-256-gcm";

/**
 * Generates a secure random webhook secret.
 * @returns {string} The raw webhook secret
 */
export const generateWebhookSecret = () => {
    return `whsec_${crypto.randomBytes(32).toString("hex")}`;
};

/**
 * Encrypts a webhook secret for storage in MongoDB.
 * @param {string} secret - The raw webhook secret
 * @returns {string} The encrypted secret string
 */
export const encryptSecret = (secret) => {
    // Generate a random 12-byte initialization vector
    const iv = crypto.randomBytes(12);
    
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    let encrypted = cipher.update(secret, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");

    // Format: iv:authTag:encryptedData
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a stored webhook secret.
 * @param {string} encryptedSecret - The encrypted string from MongoDB
 * @returns {string} The decrypted raw webhook secret
 */
export const decryptSecret = (encryptedSecret) => {
    const parts = encryptedSecret.split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted secret format");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY),
        Buffer.from(ivHex, "hex")
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
};
