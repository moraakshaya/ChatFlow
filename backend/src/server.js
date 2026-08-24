import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import connectDB from "./config/database.js";
import { initializeSocket } from "./socket/index.js";
import { webhookWorker } from "./workers/webhook.worker.js";
import logger from "./utils/logger.js";

// Routes are mounted in app.js

// Note: Routes and Error Handlers are configured in app.js

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