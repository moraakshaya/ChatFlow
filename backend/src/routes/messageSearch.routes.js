import express from "express";
import { searchMessages } from "../controllers/messageSearch.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Search routes require authentication
router.use(protect);

router.route("/")
    .get(searchMessages);

export default router;
