import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app.js";
import connectDB from "./config/database.js";
import { initializeSocket } from "./socket/index.js";
import { webhookWorker } from "./workers/webhook.worker.js";
import logger from "./utils/logger.js";

// Import Routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import projectRoutes from "./routes/project.routes.js";
import conversationRoutes from "./routes/conversation.routes.js";
import conversationMemberRoutes from "./routes/conversationMember.routes.js";
import messageRoutes from "./routes/message.routes.js";
import messageReactionRoutes from "./routes/messageReaction.routes.js";
import readReceiptRoutes from "./routes/readReceipt.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";
import messageSearchRoutes from "./routes/messageSearch.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import unreadRoutes from "./routes/unread.routes.js";
import notificationPreferenceRoutes from "./routes/notificationPreference.routes.js";

dotenv.config();

// Mount Routes
app.use("/api/auth", authRoutes);
// notificationPreferenceRoutes must be mounted before userRoutes to avoid /:id capture
app.use("/api/users/me/notification-preferences", notificationPreferenceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);

// unreadRoutes must be mounted before conversationRoutes to avoid /:id capturing /unread
app.use("/api/conversations", unreadRoutes);
app.use("/api/conversations", conversationRoutes);

app.use("/api/conversation-members", conversationMemberRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/message-reactions", messageReactionRoutes);
app.use("/api/read-receipts", readReceiptRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/search", messageSearchRoutes);
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Connect to MongoDB
connectDB();

// Start background workers
webhookWorker.start();

httpServer.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
});