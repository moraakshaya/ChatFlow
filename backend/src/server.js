import dotenv from "dotenv";
import { createServer } from "http";
import app from "./app.js";
import connectDB from "./config/database.js";
import { initializeSocket } from "./socket/index.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Connect to MongoDB
connectDB();

httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});