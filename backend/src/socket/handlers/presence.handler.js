import EVENTS from "../events.js";
import { presenceService } from "../../services/presence.service.js";
import ConversationMember from "../../models/ConversationMember.js";
import mongoose from "mongoose";
import AppError from "../../errors/AppError.js";
import { ERROR_CODES } from "../../errors/errorCodes.js";
import { handleSocketError } from "../middleware/error.socket.js";
import logger from "../../utils/logger.js";

/**
 * Finds all active conversations for a user to broadcast presence changes.
 */
const broadcastPresenceTransition = async (io, userId, eventType) => {
    try {
        const memberships = await ConversationMember.find({
            userId: mongoose.Types.ObjectId.createFromHexString(userId),
            status: "active"
        });

        for (const membership of memberships) {
            const roomName = `conversation_${membership.conversationId.toString()}`;
            io.to(roomName).emit(eventType, { userId });
        }
    } catch (err) {
        logger.error({ event: "presence.broadcast.error", error: err.message, userId, eventType }, "Error broadcasting presence transition");
    }
};

/**
 * Handles user connection and tracks multi-device presence.
 * Broadcasts presence:online only to relevant conversation rooms.
 */
export const handleConnect = async (io, socket) => {
    const userId = socket.user._id.toString();

    const isNewOnline = await presenceService.registerSocket(userId, socket.id);

    if (isNewOnline) {
        // User transitioned from OFFLINE to ONLINE
        await broadcastPresenceTransition(io, userId, EVENTS.PRESENCE_ONLINE);
    }
};

/**
 * Handles user disconnection and updates presence.
 * Broadcasts presence:offline only to relevant conversation rooms.
 */
export const handleDisconnect = async (io, socket) => {
    const userId = socket.user._id.toString();

    const isNowOffline = await presenceService.removeSocket(userId, socket.id);

    if (isNowOffline) {
        // User transitioned from ONLINE to OFFLINE
        await broadcastPresenceTransition(io, userId, EVENTS.PRESENCE_OFFLINE);
    }
};

/**
 * Registers explicit presence requests like presence:get
 */
export const registerPresenceHandlers = (io, socket) => {
    const userId = socket.user._id.toString();

    socket.on(EVENTS.PRESENCE_GET, async (payload, callback) => {
        try {
            const { conversationId } = payload;
            if (!conversationId) return;

            // 1. Verify user membership in this conversation
            const isMember = await ConversationMember.findOne({
                conversationId: mongoose.Types.ObjectId.createFromHexString(conversationId),
                userId: mongoose.Types.ObjectId.createFromHexString(userId),
                status: "active"
            });

            if (!isMember) {
                handleSocketError(socket, new AppError("You do not have access to this conversation", 403, ERROR_CODES.FORBIDDEN), callback);
                return;
            }

            // 2. Acknowledge successfully
            if (typeof callback === "function") {
                callback({ success: true });
            }

            // 3. Find all members of the conversation
            const allMembers = await ConversationMember.find({
                conversationId: mongoose.Types.ObjectId.createFromHexString(conversationId),
                status: "active"
            });

            const userIds = allMembers.map(m => m.userId.toString());

            // 4. Get their presence states
            const presenceStates = await presenceService.getUsersPresence(userIds);

            // 5. Emit the snapshot back only to the requesting socket
            socket.emit(EVENTS.PRESENCE_STATE, {
                conversationId,
                users: presenceStates
            });

        } catch (err) {
            handleSocketError(socket, err, callback);
        }
    });
};
