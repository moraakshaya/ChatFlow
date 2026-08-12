import Webhook from "../models/Webhook.js";
import WebhookDelivery from "../models/WebhookDelivery.js";
import { webhookQueue } from "../queues/webhook.queue.js";
import { decryptSecret } from "../utils/webhookSecret.js";
import { generateSignature } from "../utils/webhookSignature.js";
import logger from "../utils/logger.js";
import { redisClient } from "../config/redis.config.js";

const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

class WebhookWorker {
    constructor() {
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info({ event: "webhook_worker.started" });
        this.poll();
    }

    stop() {
        this.isRunning = false;
        logger.info({ event: "webhook_worker.stopped" });
    }

    async poll() {
        while (this.isRunning) {
            try {
                if (redisClient.status !== "ready") {
                    await new Promise(r => setTimeout(r, 1000));
                    continue;
                }

                const jobDataString = await webhookQueue.dequeue(5); // Block for 5 seconds max
                if (!jobDataString) continue;

                const jobData = JSON.parse(jobDataString);
                await this.processJob(jobData);
            } catch (err) {
                logger.error({ event: "webhook_worker.poll_error", error: err.message });
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    async processJob({ deliveryId, payload }) {
        try {
            const delivery = await WebhookDelivery.findById(deliveryId).populate("webhookId");
            if (!delivery) return;

            const webhook = delivery.webhookId;
            if (!webhook || webhook.status !== "active") {
                await WebhookDelivery.findByIdAndUpdate(deliveryId, { status: "failed", failureReason: "Webhook inactive or deleted" });
                return;
            }

            // Check if we need to delay execution (due to retry backoff)
            if (delivery.nextRetryAt && new Date() < new Date(delivery.nextRetryAt)) {
                // Re-enqueue after the delay. Since we don't have a real delayed queue, use setTimeout in memory
                const delayMs = new Date(delivery.nextRetryAt).getTime() - Date.now();
                setTimeout(() => webhookQueue.enqueue(JSON.stringify({ deliveryId, payload })), delayMs);
                return;
            }

            // Update to processing
            delivery.status = "processing";
            delivery.attempt += 1;
            delivery.lastAttemptAt = new Date();
            await delivery.save();

            // Decrypt secret
            const secret = decryptSecret(webhook.secretEncrypted);

            // Construct payload
            const timestamp = Math.floor(Date.now() / 1000);
            const requestBody = JSON.stringify({
                id: delivery.eventId,
                type: delivery.eventType,
                version: delivery.eventVersion,
                createdAt: new Date().toISOString(),
                projectId: webhook.projectId,
                data: payload
            });

            // Generate signature
            const signature = generateSignature(secret, requestBody, timestamp);

            // Send request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            let response;
            let errorMsg = null;

            try {
                response = await fetch(webhook.url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Webhook-ID": webhook._id.toString(),
                        "X-Webhook-Event": delivery.eventType,
                        "X-Webhook-Version": delivery.eventVersion,
                        "X-Webhook-Timestamp": timestamp.toString(),
                        "X-Webhook-Signature": signature
                    },
                    body: requestBody,
                    signal: controller.signal
                });
            } catch (err) {
                errorMsg = err.name === "AbortError" ? "Request Timeout" : err.message;
            } finally {
                clearTimeout(timeoutId);
            }

            // Handle Response
            if (!errorMsg && response && response.ok) {
                // Success
                await WebhookDelivery.findByIdAndUpdate(deliveryId, {
                    status: "success",
                    responseStatus: response.status,
                    deliveredAt: new Date()
                });
                
                // Update webhook last delivery
                await Webhook.findByIdAndUpdate(webhook._id, { lastDeliveryAt: new Date() });
                
                logger.info({ event: "webhook_worker.delivered", deliveryId, webhookId: webhook._id });
                return;
            }

            // Handle Failure
            const statusCode = response ? response.status : null;
            const isRetryable = errorMsg || [408, 429, 500, 502, 503, 504].includes(statusCode);
            
            let nextRetryAt = null;
            let failureReason = errorMsg || `HTTP ${statusCode}`;

            if (isRetryable && delivery.attempt < MAX_ATTEMPTS) {
                // Calculate backoff
                let delayMs = Math.pow(2, delivery.attempt) * 1000; // 2s, 4s, 8s...
                
                if (statusCode === 429 && response.headers.has("retry-after")) {
                    const retryAfter = response.headers.get("retry-after");
                    if (!isNaN(retryAfter)) {
                        delayMs = parseInt(retryAfter) * 1000;
                    }
                }
                
                nextRetryAt = new Date(Date.now() + delayMs);
                
                await WebhookDelivery.findByIdAndUpdate(deliveryId, {
                    status: "pending",
                    responseStatus: statusCode,
                    nextRetryAt,
                    failureReason
                });

                // Re-enqueue (our simple backoff handling will catch it at the top)
                webhookQueue.enqueue(JSON.stringify({ deliveryId, payload }));
                
                logger.warn({ event: "webhook_worker.retry_scheduled", deliveryId, attempt: delivery.attempt, delayMs });
            } else {
                // Permanent failure
                await WebhookDelivery.findByIdAndUpdate(deliveryId, {
                    status: "failed",
                    responseStatus: statusCode,
                    nextRetryAt: null,
                    failureReason: `Final failure: ${failureReason}`
                });
                
                logger.error({ event: "webhook_worker.final_failure", deliveryId, reason: failureReason });
            }

        } catch (err) {
            logger.error({ event: "webhook_worker.process_error", deliveryId, error: err.message });
        }
    }
}

export const webhookWorker = new WebhookWorker();
