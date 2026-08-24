import express from "express";
import { getLogs } from "../controllers/activityLog.controller.js";
import { protect, requireAdmin } from "../middleware/auth.middleware.js";

const router = express.Router();

// Only admin and owner can view activity logs
router.use(protect);
router.use(requireAdmin);

router.route("/")
    .get(getLogs);

export default router;
