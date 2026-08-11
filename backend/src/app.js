import express from "express";
import cors from "cors";
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
import errorHandler from "./middleware/error.middleware.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Needed to parse JSON request bodies

// Routes
app.use("/api/organizations", organizationRoutes);
app.use("/api/projects", projectRoutes);
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

// Global Error Handler
app.use(errorHandler);

export default app;