import express from "express";
import { protect, requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import { generalRateLimiter } from "../middleware/rateLimit.middleware.js";
import { validateParamId } from "../validators/common.validator.js";
import { createWorkspaceValidator, updateWorkspaceValidator } from "../validators/workspace.validator.js";
import {
    createWorkspace,
    getAllWorkspaces,
    getWorkspaceById,
    getWorkspacesByProject,
    updateWorkspace,
    deleteWorkspace
} from "../controllers/workspace.controller.js";

import { requireProjectAccess, requireWorkspaceAccess } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.use(protect);
router.use(generalRateLimiter);

router.route("/")
    .post(requireAdmin, validate(createWorkspaceValidator), createWorkspace)
    .get(getAllWorkspaces); // Typically should also be scoped, but handled in controller or removed if not used globally.

// Apply requireProjectAccess for project specific routes
router.use("/project/:projectId", requireProjectAccess);
router.route("/project/:projectId")
    .get(validate([validateParamId("projectId")]), getWorkspacesByProject);

// Apply requireWorkspaceAccess for individual workspace routes
router.use("/:id", requireWorkspaceAccess);
router.route("/:id")
    .get(validate([validateParamId()]), getWorkspaceById)
    .patch(requireAdmin, validate([validateParamId(), ...updateWorkspaceValidator]), updateWorkspace)
    .delete(requireAdmin, validate([validateParamId()]), deleteWorkspace);

export default router;
