import express from "express";
import { 
    createWebhook, 
    listWebhooks, 
    getWebhook, 
    updateWebhook, 
    deleteWebhook, 
    enableWebhook, 
    disableWebhook,
    testWebhook
} from "../controllers/webhook.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router({ mergeParams: true });

router.use(protect);

router.post("/", createWebhook);
router.get("/", listWebhooks);
router.get("/:webhookId", getWebhook);
router.patch("/:webhookId", updateWebhook);
router.delete("/:webhookId", deleteWebhook);

router.patch("/:webhookId/enable", enableWebhook);
router.patch("/:webhookId/disable", disableWebhook);
router.post("/:webhookId/test", testWebhook);

export default router;
