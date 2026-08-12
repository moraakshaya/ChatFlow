import express from "express";
import { createApiKey, listApiKeys, getApiKey, revokeApiKey } from "../controllers/apiKey.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router({ mergeParams: true });

router.use(protect);

router.post("/", createApiKey);
router.get("/", listApiKeys);
router.get("/:keyId", getApiKey);
router.patch("/:keyId/revoke", revokeApiKey);

export default router;
