import express from "express";
import {
    createOrganization,
    getAllOrganizations,
    getOrganizationById,
    getOrganizationBySlug,
    updateOrganization,
    deleteOrganization
} from "../controllers/organization.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import { generalRateLimiter } from "../middleware/rateLimit.middleware.js";
import { validateParamId } from "../validators/common.validator.js";
import { createOrganizationValidator, updateOrganizationValidator } from "../validators/organization.validator.js";

const router = express.Router();

router.use(protect);
router.use(generalRateLimiter);

router.route("/")
    .post(validate(createOrganizationValidator), createOrganization)
    .get(getAllOrganizations);

router.route("/slug/:slug")
    .get(getOrganizationBySlug);

router.route("/:id")
    .get(validate([validateParamId()]), getOrganizationById)
    .patch(validate([validateParamId(), ...updateOrganizationValidator]), updateOrganization)
    .delete(validate([validateParamId()]), deleteOrganization);

export default router;