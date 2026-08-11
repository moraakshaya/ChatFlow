import express from "express";
import {
    createWorkspace,
    getAllWorkspaces,
    getWorkspaceById,
    getWorkspacesByProject,
    updateWorkspace,
    deleteWorkspace
} from "../controllers/workspace.controller.js";

const router = express.Router();

router.route("/")
    .post(createWorkspace)
    .get(getAllWorkspaces);

router.route("/project/:projectId")
    .get(getWorkspacesByProject);

router.route("/:id")
    .get(getWorkspaceById)
    .patch(updateWorkspace)
    .delete(deleteWorkspace);

export default router;
