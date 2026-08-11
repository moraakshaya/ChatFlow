import express from "express";
import {
    addOrUpdateReaction,
    getMessageReactions,
    removeReaction
} from "../controllers/messageReaction.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All reaction routes require authentication
router.use(protect);

router.route("/")
    .post(addOrUpdateReaction);

router.route("/message/:messageId")
    .get(getMessageReactions)
    .delete(removeReaction);

export default router;
