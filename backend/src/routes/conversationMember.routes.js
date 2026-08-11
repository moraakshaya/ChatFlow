import express from "express";
import {
    addMember,
    getConversationMembers,
    getMyConversations,
    checkMembership,
    updateRole,
    removeMember,
    leaveConversation,
    muteConversation,
    pinConversation
} from "../controllers/conversationMember.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.route("/")
    .post(addMember);

router.route("/me")
    .get(getMyConversations);

router.route("/conversation/:conversationId")
    .get(getConversationMembers);

router.route("/check/:conversationId/:userId")
    .get(checkMembership);

router.route("/:id")
    .delete(removeMember);

router.route("/:id/role")
    .patch(updateRole);

router.route("/:id/leave")
    .patch(leaveConversation);

router.route("/:id/mute")
    .patch(muteConversation);

router.route("/:id/pin")
    .patch(pinConversation);

export default router;
