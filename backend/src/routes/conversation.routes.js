import express from "express";
import {
    createConversation,
    getConversations,
    getConversationById,
    getConversationsByWorkspace,
    updateConversation,
    archiveConversation,
    unarchiveConversation,
    deleteConversation
} from "../controllers/conversation.controller.js";
import { transferOwnership } from "../controllers/conversationMember.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import { generalRateLimiter } from "../middleware/rateLimit.middleware.js";
import { validateParamId } from "../validators/common.validator.js";
import { createConversationValidator } from "../validators/conversation.validator.js";

import { requireWorkspaceAccess, requireConversationMembership, requireConversationManagement } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.use(protect); // All conversation routes require authentication
router.use(generalRateLimiter);

router.route("/")
    .post(validate(createConversationValidator), createConversation)
    .get(getConversations);

// Apply requireWorkspaceAccess
router.use("/workspace/:workspaceId", requireWorkspaceAccess);
router.route("/workspace/:workspaceId")
    .get(getConversationsByWorkspace);

// Apply requireConversationManagement for ownership transfer
router.use("/:conversationId/transfer-ownership", requireConversationManagement);
router.route("/:conversationId/transfer-ownership")
    .patch(transferOwnership);

// Apply requireConversationMembership for GET
router.use("/:id", requireConversationMembership);
router.route("/:id")
    .get(getConversationById);

// Apply requireConversationManagement for mutations
router.use("/:id", requireConversationManagement);
router.route("/:id")
    .patch(updateConversation)
    .delete(deleteConversation);

router.route("/:id/archive")
    .patch(archiveConversation);

router.route("/:id/unarchive")
    .patch(unarchiveConversation);

export default router;
