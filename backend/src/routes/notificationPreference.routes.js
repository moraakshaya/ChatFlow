import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import { generalRateLimiter } from "../middleware/rateLimit.middleware.js";
import { updatePreferencesValidator } from "../validators/notificationPreference.validator.js";
import {
    getPreferences,
    updatePreferences
} from "../controllers/notificationPreference.controller.js";

const router = express.Router();

router.use(protect);
router.use(generalRateLimiter); // All preference routes require authentication

// Note: Mounted at /api/users/me/notification-preferences
router.route("/")
    .get(getPreferences)
    .patch(updatePreferences);

export default router;
