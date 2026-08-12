import crypto from "crypto";

/**
 * Generates an HMAC-SHA256 signature for a webhook payload.
 * @param {string} secret - The decrypted webhook secret
 * @param {string} payload - The raw JSON string of the request body
 * @param {string|number} timestamp - The timestamp used in the request
 * @returns {string} The generated signature in format 'sha256=...'
 */
export const generateSignature = (secret, payload, timestamp) => {
    const signedContent = `${timestamp}.${payload}`;
    
    const signature = crypto
        .createHmac("sha256", secret)
        .update(signedContent)
        .digest("hex");
        
    return `sha256=${signature}`;
};

/**
 * Verifies an HMAC-SHA256 signature using constant-time comparison.
 * @param {string} secret - The decrypted webhook secret
 * @param {string} payload - The raw JSON string of the request body
 * @param {string|number} timestamp - The timestamp used in the request
 * @param {string} receivedSignature - The signature from the headers
 * @returns {boolean} True if the signature is valid
 */
export const verifySignature = (secret, payload, timestamp, receivedSignature) => {
    try {
        const expectedSignature = generateSignature(secret, payload, timestamp);
        
        // Use constant-time string comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature),
            Buffer.from(receivedSignature)
        );
    } catch (err) {
        // Fallback or catch if formats are wildly mismatched causing Buffer.from to fail
        return false;
    }
};
