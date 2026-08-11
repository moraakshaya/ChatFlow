import express from "express";
import {
    getUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect); // All user routes require authentication

router.route("/")
    .get(getUsers);

router.route("/:id")
    .get(getUserById)
    .patch(updateUser)
    .delete(deleteUser);

router.route("/:id/status")
    .patch(updateUserStatus);

export default router;
