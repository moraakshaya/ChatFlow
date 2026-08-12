import Webhook from "../models/Webhook.js";
import { generateWebhookSecret, encryptSecret } from "../utils/webhookSecret.js";
import AppError from "../errors/AppError.js";
import { ERROR_CODES } from "../errors/errorCodes.js";
import logger from "../utils/logger.js";

class WebhookService {
    /**
     * Create a new webhook
     */
    async createWebhook({ projectId, organizationId, name, url, events, createdBy }) {
        // Simple SSRF/URL validation could go here, e.g., using `new URL(url)` and checking hostname
        try {
            const parsedUrl = new URL(url);
            if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname)) {
                // In a real prod env we would strictly reject these, but maybe allow for testing.
                logger.warn({ event: "webhook.local_target", url });
            }
        } catch (err) {
            throw new AppError("Invalid webhook URL", 400, ERROR_CODES.VALIDATION_ERROR);
        }

        const rawSecret = generateWebhookSecret();
        const secretEncrypted = encryptSecret(rawSecret);

        const webhook = await Webhook.create({
            projectId,
            organizationId,
            name,
            url,
            events: events || [],
            secretEncrypted,
            createdBy
        });

        logger.info({ event: "webhook.created", webhookId: webhook._id, projectId });

        const safeWebhook = this._sanitizeWebhook(webhook);

        // Return the raw secret exactly once
        return {
            ...safeWebhook,
            secret: rawSecret
        };
    }

    /**
     * List all webhooks for a project
     */
    async listWebhooks(projectId, organizationId) {
        const webhooks = await Webhook.find({ projectId, organizationId }).lean();
        return webhooks.map(w => this._sanitizeWebhook(w));
    }

    /**
     * Get a specific webhook
     */
    async getWebhook(webhookId, projectId, organizationId) {
        const webhook = await Webhook.findOne({ _id: webhookId, projectId, organizationId }).lean();
        if (!webhook) {
            throw new AppError("Webhook not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }
        return this._sanitizeWebhook(webhook);
    }

    /**
     * Update a webhook
     */
    async updateWebhook(webhookId, projectId, organizationId, updateData) {
        const allowedUpdates = {};
        if (updateData.name) allowedUpdates.name = updateData.name;
        if (updateData.url) {
            try {
                new URL(updateData.url);
                allowedUpdates.url = updateData.url;
            } catch {
                throw new AppError("Invalid webhook URL", 400, ERROR_CODES.VALIDATION_ERROR);
            }
        }
        if (updateData.events) allowedUpdates.events = updateData.events;

        const webhook = await Webhook.findOneAndUpdate(
            { _id: webhookId, projectId, organizationId },
            { $set: allowedUpdates },
            { new: true }
        ).lean();

        if (!webhook) {
            throw new AppError("Webhook not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        return this._sanitizeWebhook(webhook);
    }

    /**
     * Toggle webhook active/inactive status
     */
    async toggleStatus(webhookId, projectId, organizationId, status) {
        if (!["active", "inactive"].includes(status)) {
            throw new AppError("Invalid status", 400, ERROR_CODES.VALIDATION_ERROR);
        }

        const webhook = await Webhook.findOneAndUpdate(
            { _id: webhookId, projectId, organizationId },
            { $set: { status } },
            { new: true }
        ).lean();

        if (!webhook) {
            throw new AppError("Webhook not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        logger.info({ event: `webhook.${status}`, webhookId, projectId });
        return this._sanitizeWebhook(webhook);
    }

    /**
     * Delete a webhook
     */
    async deleteWebhook(webhookId, projectId, organizationId) {
        const webhook = await Webhook.findOneAndDelete({ _id: webhookId, projectId, organizationId });
        if (!webhook) {
            throw new AppError("Webhook not found", 404, ERROR_CODES.RESOURCE_NOT_FOUND);
        }

        logger.info({ event: "webhook.deleted", webhookId, projectId });
        return true;
    }

    /**
     * Strip secrets from the response
     */
    _sanitizeWebhook(webhook) {
        const safe = { ... (webhook._doc || webhook) };
        delete safe.secretEncrypted;
        return safe;
    }
}

export const webhookService = new WebhookService();
