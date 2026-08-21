import { Server } from "socket.io";
import { verifySocketToken } from "./middleware/auth.socket.js";
import { handleConnect, handleDisconnect, registerPresenceHandlers } from "./handlers/presence.handler.js";
import { registerRoomHandlers } from "./handlers/room.handler.js";
import { registerTypingHandlers, handleTypingDisconnect } from "./handlers/typing.handler.js";
import { registerReadReceiptHandlers } from "./handlers/readReceipt.handler.js";
import { registerMessageReactionHandlers } from "./handlers/messageReaction.handler.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { redisClient, subClient } from "../config/redis.config.js";
import logger from "../utils/logger.js";

let io;

/**
 * Initializes the Socket.IO server and binds it to the HTTP server.
 * @param {import("http").Server} httpServer 
 */
export const initializeSocket = (httpServer) => {
    const socketOptions = {
        cors: {
            origin: process.env.CLIENT_URL || "*", // Adjust CORS for production
            methods: ["GET", "POST"]
        }
    };

    // Only use Redis adapter in production or if explicitly enabled,
    // otherwise fallback to in-memory adapter for local dev without Redis.
    if (process.env.NODE_ENV === "production" || process.env.USE_REDIS === "true") {
        socketOptions.adapter = createAdapter(redisClient, subClient);
    }

    io = new Server(httpServer, socketOptions);

    // 1. Authentication Middleware
    io.use(verifySocketToken);

    // 2. Connection Handler
    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        logger.info({ event: "socket.connected", socketId: socket.id, userId });

        // Automatically join the user to their private room for direct notifications
        socket.join(`user_${userId}`);

        // Register Presence & Room Handlers
        handleConnect(io, socket);
        registerPresenceHandlers(io, socket);
        registerRoomHandlers(io, socket);
        registerTypingHandlers(io, socket);
        registerReadReceiptHandlers(io, socket);
        registerMessageReactionHandlers(io, socket);

        // Disconnection Handler
        socket.on("disconnect", (reason) => {
            logger.info({ event: "socket.disconnected", socketId: socket.id, userId, reason });
            handleDisconnect(io, socket);
            handleTypingDisconnect(io, socket);
        });
    });

    return io;
};

/**
 * Retrieves the initialized Socket.IO instance.
 * @throws {Error} If io is not initialized
 */
export const getIo = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
