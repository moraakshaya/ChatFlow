import express from "express";
import { createWidgetSession } from "../../../controllers/public/v1/widget.controller.js";
import { apiAuthentication } from "../../../middleware/apiAuthentication.middleware.js";

const router = express.Router({ mergeParams: true });

// Uses standard API Key auth from the external backend
router.use(apiAuthentication);

router.post("/sessions", createWidgetSession);

export default router;
