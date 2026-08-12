import crypto from "crypto";
import bcrypt from "bcrypt";

/**
 * Generates a cryptographically secure random string
 * @param {number} bytes - Number of random bytes
 * @returns {string} Hex encoded random string
 */
const generateRandomString = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString("hex");
};

/**
 * Generates a full API key and its corresponding hash for storage.
 * @param {string} prefix - The environment prefix (e.g., 'cp_live', 'cp_test')
 * @returns {Promise<{ fullKey: string, keyId: string, keyHash: string, keyPrefix: string }>}
 */
export const generateApiKey = async (prefix = "cp_live") => {
    // Generate a unique non-secret identifier (e.g. 12 characters / 6 bytes)
    const keyId = generateRandomString(6);
    
    // Generate the secret portion (e.g. 64 characters / 32 bytes)
    const secret = generateRandomString(32);
    
    // Construct the full API key provided to the user
    const fullKey = `${prefix}_${keyId}_${secret}`;
    
    // Hash the secret portion (we don't need to hash the prefix or keyId, they are public)
    const saltRounds = 10;
    const keyHash = await bcrypt.hash(secret, saltRounds);

    return {
        fullKey,
        keyId,
        keyHash,
        keyPrefix: prefix
    };
};

/**
 * Parses an incoming API key into its components
 * @param {string} fullKey - The incoming API key (e.g., 'cp_live_1a2b3c_xxxxxxxx')
 * @returns {{ prefix: string, keyId: string, secret: string } | null}
 */
export const parseApiKey = (fullKey) => {
    if (!fullKey || typeof fullKey !== "string") return null;

    const parts = fullKey.split("_");
    
    // Format: prefixEnv_prefixType_keyId_secret (e.g. cp_live_1a2b3c_xxxx)
    // Actually our prefix is 'cp_live', so it splits into ['cp', 'live', 'keyId', 'secret']
    if (parts.length === 4 && parts[0] === "cp") {
        return {
            prefix: `${parts[0]}_${parts[1]}`, // 'cp_live'
            keyId: parts[2],
            secret: parts[3]
        };
    }

    return null;
};

/**
 * Verifies if the provided secret matches the stored hash
 * @param {string} secret - The plain text secret extracted from the API key
 * @param {string} hash - The stored bcrypt hash
 * @returns {Promise<boolean>}
 */
export const verifyApiKeySecret = async (secret, hash) => {
    return bcrypt.compare(secret, hash);
};
