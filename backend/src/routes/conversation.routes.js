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

const router = express.Router();

router.use(protect); // All conversation routes require authentication

router.route("/")
    .post(createConversation)
    .get(getConversations);

router.route("/workspace/:workspaceId")
    .get(getConversationsByWorkspace);

router.route("/:conversationId/transfer-ownership")
    .patch(transferOwnership);

router.route("/:id")
    .get(getConversationById)
    .patch(updateConversation)
    .delete(deleteConversation);

router.route("/:id/archive")
    .patch(archiveConversation);

router.route("/:id/unarchive")
    .patch(unarchiveConversation);

export default router;
