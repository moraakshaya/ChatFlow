import express from "express";
import {
    createProject,
    getAllProjects,
    getProjectById,
    getProjectsByOrganization,
    updateProject,
    deleteProject
} from "../controllers/project.controller.js";
import { protect, requireAdmin } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import { generalRateLimiter } from "../middleware/rateLimit.middleware.js";
import { validateParamId } from "../validators/common.validator.js";
import { createProjectValidator, updateProjectValidator } from "../validators/project.validator.js";

import { requireProjectAccess } from "../middleware/authorization.middleware.js";

const router = express.Router();

router.use(protect);
router.use(generalRateLimiter);

router.route("/")
    .post(requireAdmin, validate(createProjectValidator), createProject)
    .get(getAllProjects);

router.route("/organization/:organizationId")
    .get(getProjectsByOrganization);

// Apply requireProjectAccess for individual project routes
router.use("/:id", requireProjectAccess);
router.route("/:id")
    .get(validate([validateParamId()]), getProjectById)
    .patch(requireAdmin, validate([validateParamId(), ...updateProjectValidator]), updateProject)
    .delete(requireAdmin, validate([validateParamId()]), deleteProject);

export default router;
