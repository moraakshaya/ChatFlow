import express from "express";
import {
    register,
    login,
    refresh,
    logout,
    logoutAll,
    getMe,
    changePassword,
    forgotPassword,
    resetPassword
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authRateLimiter } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

router.post("/register", authRateLimiter, register);
router.post("/login", authRateLimiter, login);
router.post("/refresh", authRateLimiter, refresh);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAll);
router.get("/me", protect, getMe);
router.patch("/change-password", protect, changePassword);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);

export default router;
