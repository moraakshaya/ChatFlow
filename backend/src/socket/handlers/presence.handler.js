import EVENTS from "../events.js";
import { presenceService } from "../../services/presence.service.js";
import ConversationMember from "../../models/ConversationMember.js";
import mongoose from "mongoose";
import AppError from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
import { handleSocketError } from "../middleware/error.socket.js";
import logger from "../../utils/logger.js";

/**
 * Returns the number of LIVE socket connections for a user.
 *
 * Socket.IO removes a socket from all rooms BEFORE firing the disconnect event,
 * so io.sockets.adapter.rooms.get(`user_${userId}`)?.size is always accurate:
 *   - On connect  → size >= 1 (this socket was just added)
 *   - On disconnect → size = remaining live connections (this socket already gone)
 *
 * This is the authoritative source of truth, bypassing any stale data in
 * Redis or the in-memory store.
 */
const getLiveSocketCount = (io, userId) => {
    const room = io.sockets.adapter.rooms.get(`user_${userId}`);
    return room ? room.size : 0;
};

/**
 * Finds all unique co-members across every conversation the user belongs to,
 * then emits the presence event to each co-member's personal `user_X` room.
 */
const broadcastPresenceTransition = async (io, userId, eventType) => {
    try {
        const memberships = await ConversationMember.find({
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            status: "active"
        });

        if (!memberships.length) return;

        const conversationIds = memberships.map(m => m.conversationId);

        const sharedMembers = await ConversationMember.find({
            conversationId: { $in: conversationIds },
            userId: { $ne: mongoose.Types.ObjectId.createFromHexString(userId) },
            status: "active"
        });

        const uniqueMemberIds = [...new Set(sharedMembers.map(m => m.userId.toString()))];

        uniqueMemberIds.forEach(memberId => {
            io.to(`user_${memberId}`).emit(eventType, { userId });
        });

        logger.info(
            { event: "presence.broadcast", userId, eventType, recipients: uniqueMemberIds.length },
            "[Presence] Broadcasted presence transition"
        );
    } catch (err) {
        logger.error({ event: "presence.broadcast.error", error: err.message, userId, eventType }, "Error broadcasting presence transition");
    }
};

/**
 * Called on socket connect. Uses room size === 1 to detect the
 * offline → online transition (only the FIRST tab/device counts).
 */
export const handleConnect = async (io, socket) => {
    const userId = socket.user._id.toString();

    // Keep the store in sync (best-effort, used only for presence:get snapshots)
    await presenceService.registerSocket(userId, socket.id);

    // Authoritative check: if this is the user's only socket → they just came online
    const liveCount = getLiveSocketCount(io, userId);
    logger.info({ userId, socketId: socket.id, liveCount }, "[Presence] Socket connected");

    if (liveCount === 1) {
        // Exactly one live socket means we just transitioned offline → online
        await broadcastPresenceTransition(io, userId, EVENTS.PRESENCE_ONLINE);
    }
};

/**
 * Called on socket disconnect. Uses room size === 0 (AFTER Socket.IO has
 * already removed the socket from all rooms) to detect the online → offline
 * transition. This is immune to stale store data or ghost sockets.
 */
export const handleDisconnect = async (io, socket) => {
    const userId = socket.user._id.toString();

    // Keep the store in sync (best-effort)
    await presenceService.removeSocket(userId, socket.id);

    // Authoritative check: Socket.IO removes the socket from rooms BEFORE this
    // event fires. So if size === 0, the user truly has no live connections.
    const liveCount = getLiveSocketCount(io, userId);
    logger.info({ userId, socketId: socket.id, liveCount }, "[Presence] Socket disconnected");

    if (liveCount === 0) {
        await broadcastPresenceTransition(io, userId, EVENTS.PRESENCE_OFFLINE);
    }
};

/**
 * Handles presence:get requests — returns a snapshot of online/offline
 * status for all members of the requested conversation.
 * Uses Socket.IO room data (not the store) as the source of truth.
 */
export const registerPresenceHandlers = (io, socket) => {
    const userId = socket.user._id.toString();

    socket.on(EVENTS.PRESENCE_GET, async (payload, callback) => {
        try {
            const { conversationId } = payload;
            if (!conversationId) return;

            // Verify membership
            const isMember = await ConversationMember.findOne({
                conversationId: mongoose.Types.ObjectId.createFromHexString(conversationId),
                userId: mongoose.Types.ObjectId.createFromHexString(userId),
                status: "active"
            });

            if (!isMember) {
                handleSocketError(socket, new AppError("You do not have access to this conversation", 403, ERROR_CODES.FORBIDDEN), callback);
                return;
            }

            if (typeof callback === "function") {
                callback({ success: true });
            }

            // Get all conversation members
            const allMembers = await ConversationMember.find({
                conversationId: mongoose.Types.ObjectId.createFromHexString(conversationId),
                status: "active"
            });

            // Use Socket.IO room membership as the authoritative online check
            const presenceStates = allMembers.map(m => {
                const memberId = m.userId.toString();
                const liveCount = getLiveSocketCount(io, memberId);
                return { userId: memberId, status: liveCount > 0 ? "online" : "offline" };
            });

            socket.emit(EVENTS.PRESENCE_STATE, { conversationId, users: presenceStates });

        } catch (err) {
            handleSocketError(socket, err, callback);
        }
    });
};
