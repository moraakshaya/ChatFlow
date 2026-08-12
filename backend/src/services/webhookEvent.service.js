import Webhook from "../models/Webhook.js";
import WebhookDelivery from "../models/WebhookDelivery.js";
import { webhookQueue } from "../queues/webhook.queue.js";
import crypto from "crypto";
import logger from "../utils/logger.js";

class WebhookEventService {
    /**
     * Dispatches a domain event to all matching webhooks for a project.
     */
    async dispatchEvent(eventType, eventVersion, projectId, payloadData) {
        try {
            // Find all active webhooks for this project subscribed to this event
            const webhooks = await Webhook.find({
                projectId,
                status: "active",
                events: eventType
            });

            if (webhooks.length === 0) return;

            // Generate a unique eventId for this specific event trigger
            const eventId = `evt_${crypto.randomBytes(12).toString("hex")}`;

            // Create a delivery record for each subscribed webhook
            for (const webhook of webhooks) {
                try {
                    const delivery = await WebhookDelivery.create({
                        webhookId: webhook._id,
                        eventId,
                        eventType,
                        eventVersion,
                        status: "pending"
                    });

                    // We temporarily store the payload in redis or pass it via another means?
                    // Wait, the worker needs the payload to send it!
                    // If we only enqueue the delivery ID, the worker must fetch the payload from somewhere, 
                    // or we store the payload in the delivery record. Let's store the payload in the delivery record 
                    // for simplicity and resilience, or since we haven't added a payload field to WebhookDelivery, 
                    // we could add it dynamically to redis.
                    
                    // Let's just serialize it into a redis hash so the worker can retrieve it.
                    // Or actually, it's easier to add `payload` to WebhookDelivery. I'll dynamically add it here, 
                    // but Mongoose schema won't save it if it's strict. 
                    // Since I didn't add it to the schema, I'll put it in Redis alongside the queue.
                    
                    // Better yet: Let's enqueue a JSON string containing the deliveryId AND the payload.
                    // The queue is in redis anyway.
                    
                    const jobData = JSON.stringify({
                        deliveryId: delivery._id.toString(),
                        payload: payloadData
                    });

                    // For this, we'll modify the enqueue slightly to just push jobData
                    // Wait, if it fails and retries, where does it get the payload from? 
                    // It should probably just be pushed back onto the queue with the payload.
                    // To maintain the `webhook.queue.js` API, I'll pass the whole jobData to enqueue.
                    
                    await webhookQueue.enqueue(jobData);
                } catch (err) {
                    logger.error({ event: "webhook_event.dispatch_failed", webhookId: webhook._id, error: err.message });
                }
            }
        } catch (error) {
            logger.error({ event: "webhook_event.dispatch_global_failed", error: error.message });
        }
    }

    /**
     * Dispatch a test event to a specific webhook
     */
    async dispatchTestEvent(webhookId, projectId) {
        const webhook = await Webhook.findOne({ _id: webhookId, projectId, status: "active" });
        if (!webhook) return;

        const eventId = `evt_test_${crypto.randomBytes(12).toString("hex")}`;

        const delivery = await WebhookDelivery.create({
            webhookId: webhook._id,
            eventId,
            eventType: "webhook.test",
            eventVersion: "v1",
            status: "pending"
        });

        const jobData = JSON.stringify({
            deliveryId: delivery._id.toString(),
            payload: { message: "Webhook test successful" }
        });

        await webhookQueue.enqueue(jobData);
    }
}

export const webhookEventService = new WebhookEventService();
