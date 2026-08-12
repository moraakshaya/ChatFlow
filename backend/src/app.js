import express from "express";
import cors from "cors";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware.js";
import organizationRoutes from "./routes/organization.routes.js";
import projectRoutes from "./routes/project.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import conversationMemberRoutes from "./routes/conversationMember.routes.js";
import messageRoutes from "./routes/message.routes.js";
import messageReactionRoutes from "./routes/messageReaction.routes.js";
import readReceiptRoutes from "./routes/readReceipt.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";
import messageSearchRoutes from "./routes/messageSearch.routes.js";
import apiKeyRoutes from "./routes/apiKey.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import widgetRoutes from "./routes/public/v1/widget.routes.js";
import publicV1ConversationRoutes from "./routes/public/v1/conversation.routes.js";
import publicV1MessageRoutes from "./routes/public/v1/message.routes.js";
import errorHandler from "./middleware/error.middleware.js";
import AppError from "./errors/AppError.js";
import { ERROR_CODES } from "./errors/errorCodes.js";

const app = express();

// Middleware
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(cors());
app.use(express.json()); // Needed to parse JSON request bodies

// --- Internal API Routes ---
app.use("/api/organizations", organizationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects/:projectId/api-keys", apiKeyRoutes);
app.use("/api/projects/:projectId/webhooks", webhookRoutes);
app.use("/api/projects/:projectId/widget", widgetRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/conversation-members", conversationMemberRoutes);
app.use("/api/messages/search", messageSearchRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/message-reactions", messageReactionRoutes);
app.use("/api/read-receipts", readReceiptRoutes);
app.use("/api/attachments", attachmentRoutes);

// --- Public API Routes (v1) ---
app.use("/api/v1/conversations", publicV1ConversationRoutes);
app.use("/api/v1/messages", publicV1MessageRoutes);
app.use("/api/v1/conversations/:conversationId/messages", publicV1MessageRoutes);

// 404 Route Handler
app.use((req, res, next) => {
    next(new AppError("Route not found", 404, ERROR_CODES.ROUTE_NOT_FOUND));
});

// Global Error Handler
app.use(errorHandler);

export default app;