import { Server } from "socket.io";
import { verifySocketToken } from "./middleware/auth.socket.js";
import { handleConnect, handleDisconnect, registerPresenceHandlers } from "./handlers/presence.handler.js";
import { registerRoomHandlers } from "./handlers/room.handler.js";
import { registerTypingHandlers, handleTypingDisconnect } from "./handlers/typing.handler.js";
import { registerReadReceiptHandlers } from "./handlers/readReceipt.handler.js";

let io;

/**
 * Initializes the Socket.IO server and binds it to the HTTP server.
 * @param {import("http").Server} httpServer 
 */
export const initializeSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "*", // Adjust CORS for production
            methods: ["GET", "POST"]
        }
    });

    // 1. Authentication Middleware
    io.use(verifySocketToken);

    // 2. Connection Handler
    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        console.log(`Socket connected: ${socket.id} (User: ${userId})`);

        // Automatically join the user to their private room for direct notifications
        socket.join(`user_${userId}`);

        // Register Presence & Room Handlers
        handleConnect(io, socket);
        registerPresenceHandlers(io, socket);
        registerRoomHandlers(io, socket);
        registerTypingHandlers(io, socket);
        registerReadReceiptHandlers(io, socket);

        // Disconnection Handler
        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id} (User: ${userId})`);
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
