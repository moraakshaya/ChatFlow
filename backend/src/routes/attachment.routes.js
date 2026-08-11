import express from "express";
import {
    initUpload,
    completeUpload,
    getAttachment,
    getMessageAttachments,
    getDownloadUrl,
    deleteAttachment
} from "../controllers/attachment.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect); // All routes require auth

router.route("/upload/init")
    .post(initUpload);

router.route("/:attachmentId/complete")
    .post(completeUpload);

router.route("/message/:messageId")
    .get(getMessageAttachments);

router.route("/:attachmentId/download")
    .get(getDownloadUrl);

router.route("/:attachmentId")
    .get(getAttachment)
    .delete(deleteAttachment);

export default router;
