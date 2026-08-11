import express from "express";
import {
    createOrganization,
    getAllOrganizations,
    getOrganizationById,
    getOrganizationBySlug,
    updateOrganization,
    deleteOrganization
} from "../controllers/organization.controller.js";

const router = express.Router();

router.route("/")
    .post(createOrganization)
    .get(getAllOrganizations);

router.route("/slug/:slug")
    .get(getOrganizationBySlug);

router.route("/:id")
    .get(getOrganizationById)
    .patch(updateOrganization)
    .delete(deleteOrganization);

export default router;