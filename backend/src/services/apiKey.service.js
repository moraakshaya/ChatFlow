import ApiKey from "../models/ApiKey.js";
import { generateApiKey, parseApiKey, verifyApiKeySecret } from "../utils/apiKey.utils.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";
import logger from "../utils/logger.js";

class ApiKeyService {
    /**
     * Creates a new API Key for a project
     */
    async createApiKey({ projectId, organizationId, name, scopes, createdBy, expiresAt, prefix = "cp_live" }) {
        // Generate the key and hash
        const { fullKey, keyId, keyHash, keyPrefix } = await generateApiKey(prefix);

        // Store only the hash and metadata
        const apiKeyRecord = await ApiKey.create({
            keyId,
            projectId,
            organizationId,
            name,
            keyPrefix,
            keyHash,
            scopes: scopes || ["messages:read", "messages:write", "conversations:read", "conversations:write"],
            expiresAt,
            createdBy,
        });

        logger.info({ event: "api_key.created", projectId, keyId, createdBy });

        // Return the full key ONLY this once, plus the metadata
        return {
            fullKey,
            metadata: this._sanitizeApiKey(apiKeyRecord)
        };
    }

    /**
     * Lists all API keys for a project (metadata only)
     */
    async listApiKeys(projectId, organizationId) {
        const keys = await ApiKey.find({ projectId, organizationId })
            .sort({ createdAt: -1 })
            .lean();
        
        return keys.map(key => this._sanitizeApiKey(key));
    }

    /**
     * Retrieves specific API key metadata
     */
    async getApiKey(keyId, projectId, organizationId) {
        const key = await ApiKey.findOne({ keyId, projectId, organizationId }).lean();
        if (!key) {
            throw new AppError("API Key not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return this._sanitizeApiKey(key);
    }

    /**
     * Revokes an API Key immediately
     */
    async revokeApiKey(keyId, projectId, organizationId) {
        const key = await ApiKey.findOne({ keyId, projectId, organizationId });
        if (!key) {
            throw new AppError("API Key not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        if (key.revokedAt) {
            throw new AppError("API Key is already revoked", 400, ERROR_CODES.VALIDATION_ERROR);
        }

        key.revokedAt = new Date();
        await key.save();

        logger.info({ event: "api_key.revoked", projectId, keyId });

        return this._sanitizeApiKey(key);
    }

    /**
     * Authenticates an incoming API key string.
     * Used by the Public API middleware.
     */
    async authenticateKey(fullKey) {
        const parsed = parseApiKey(fullKey);
        
        if (!parsed) {
            throw new AppError("Invalid API key format", 401, "INVALID_API_KEY");
        }

        const { prefix, keyId, secret } = parsed;

        // 1. Find the key by keyId
        const apiKeyRecord = await ApiKey.findOne({ keyId });

        if (!apiKeyRecord) {
            // Note: We throw 401 for everything to avoid revealing if key exists
            throw new AppError("Invalid API key", 401, "INVALID_API_KEY");
        }

        // 2. Verify prefix matches
        if (apiKeyRecord.keyPrefix !== prefix) {
            throw new AppError("Invalid API key", 401, "INVALID_API_KEY");
        }

        // 3. Verify secret
        const isValid = await verifyApiKeySecret(secret, apiKeyRecord.keyHash);
        if (!isValid) {
            throw new AppError("Invalid API key", 401, "INVALID_API_KEY");
        }

        // 4. Check revocation
        if (apiKeyRecord.revokedAt) {
            throw new AppError("API key has been revoked", 401, "INVALID_API_KEY");
        }

        // 5. Check expiration
        if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
            throw new AppError("API key has expired", 401, "INVALID_API_KEY");
        }

        // 6. Update last used timestamp (asynchronously to not block auth)
        ApiKey.updateOne({ _id: apiKeyRecord._id }, { lastUsedAt: new Date() })
            .catch(err => logger.error({ event: "api_key.update_last_used_failed", error: err.message }));

        // 7. Return context for downstream processing
        return {
            projectId: apiKeyRecord.projectId,
            organizationId: apiKeyRecord.organizationId,
            scopes: apiKeyRecord.scopes,
            keyId: apiKeyRecord.keyId
        };
    }

    /**
     * Removes secret fields from API Key records
     */
    _sanitizeApiKey(keyRecord) {
        const { keyHash, ...safeRecord } = (keyRecord._doc || keyRecord);
        return {
            ...safeRecord,
            status: safeRecord.revokedAt ? 'revoked' : (safeRecord.expiresAt && safeRecord.expiresAt < new Date() ? 'expired' : 'active')
        };
    }
}

export const apiKeyService = new ApiKeyService();
