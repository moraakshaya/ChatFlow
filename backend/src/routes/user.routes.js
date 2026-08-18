import express from "express";
import {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    updateUserStatus,
    deleteUser
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import notificationPreferenceRoutes from "./notificationPreference.routes.js";

const router = express.Router();

router.use(protect); // All user routes require authentication

router.route("/")
    .post(createUser)
    .get(getUsers);

router.use("/me/notification-preferences", notificationPreferenceRoutes);

router.route("/:id")
    .get(getUserById)
    .patch(updateUser)
    .delete(deleteUser);

router.route("/:id/status")
    .patch(updateUserStatus);

export default router;
