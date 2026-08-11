import express from "express";
import {
    createProject,
    getAllProjects,
    getProjectById,
    getProjectsByOrganization,
    updateProject,
    deleteProject
} from "../controllers/project.controller.js";

const router = express.Router();

router.route("/")
    .post(createProject)
    .get(getAllProjects);

router.route("/organization/:organizationId")
    .get(getProjectsByOrganization);

router.route("/:id")
    .get(getProjectById)
    .patch(updateProject)
    .delete(deleteProject);

export default router;
