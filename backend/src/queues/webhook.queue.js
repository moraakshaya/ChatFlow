import { redisClient } from "../config/redis.config.js";
import logger from "../utils/logger.js";

const WEBHOOK_QUEUE_KEY = "queue:webhooks";

export const webhookQueue = {
    /**
     * Enqueue a WebhookDelivery ID for processing
     */
    async enqueue(deliveryId) {
        if (redisClient.status !== "ready") {
            logger.error({ event: "webhook_queue.enqueue_failed", reason: "Redis not ready", deliveryId });
            return;
        }
        await redisClient.lpush(WEBHOOK_QUEUE_KEY, deliveryId.toString());
    },
    
    /**
     * Dequeue a WebhookDelivery ID. Blocks until an item is available if timeout > 0.
     * timeout=0 blocks indefinitely.
     */
    async dequeue(timeout = 0) {
        if (redisClient.status !== "ready") return null;
        try {
            const result = await redisClient.brpop(WEBHOOK_QUEUE_KEY, timeout);
            // brpop returns [list_name, value]
            return result ? result[1] : null;
        } catch (err) {
            // Usually happens if connection drops while blocked
            return null;
        }
    }
};
