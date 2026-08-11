import mongoose from "mongoose";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import realtimeService from "../services/realtime.service.js";
import asyncHandler from "../utils/asyncHandler.js";

// Helper function to check if the user is an active member
const verifyActiveMembership = async (conversationId, userId) => {
    const membership = await ConversationMember.findOne({
        conversationId,
        userId,
        status: "active"
    });
    return !!membership;
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId, clientMessageId, type, content, attachments, replyTo, metadata } = req.body;
    const senderId = req.user._id;

    // Verify active membership
    const isMember = await verifyActiveMembership(conversationId, senderId);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    // Prepare message payload
    const messagePayload = {
        conversationId,
        senderId,
        clientMessageId,
        type,
        content: type === "text" ? content : undefined,
        attachments: type === "attachment" ? attachments : undefined,
        replyTo,
        metadata
    };

    let message;
    try {
        message = await Message.create(messagePayload);
    } catch (error) {
        // Handle MongoDB duplicate key error for idempotency check (clientMessageId + senderId)
        if (error.code === 11000) {
            // Find the existing message and return it to fulfill the idempotent request successfully
            const existingMessage = await Message.findOne({ senderId, clientMessageId });
            return res.status(200).json({
                success: true,
                message: "Message already sent",
                data: existingMessage
            });
        }
        throw error;
    }

    // Conditionally update Conversation lastMessageId and lastMessageAt
    // We only update if the new message is strictly newer than the currently stored lastMessageAt
    // However, since we just created it, it's typically newer. We use an atomic findOneAndUpdate to prevent race conditions.
    await Conversation.findOneAndUpdate(
        { 
            _id: conversationId,
            $or: [
                { lastMessageAt: { $lt: message.createdAt } },
                { lastMessageAt: null }
            ]
        },
        { 
            lastMessageId: message._id, 
            lastMessageAt: message.createdAt 
        },
        { new: true }
    );

    // Emit real-time event to authorized conversation members
    realtimeService.emitNewMessage(conversationId, message);

    res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message
    });
});

// @desc    Retrieve messages with cursor-based pagination
// @route   GET /api/messages/:conversationId
// @access  Private
export const getMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const actualLimit = limit > 100 ? 100 : limit;
    
    // cursor format will be a combination of createdAt and _id, base64 encoded.
    // Example: base64(createdAt_millis|_id)
    const { cursor } = req.query;

    // Verify active membership
    const isMember = await verifyActiveMembership(conversationId, req.user._id);
    if (!isMember) {
        return res.status(403).json({ success: false, message: "You are not an active member of this conversation" });
    }

    const query = { conversationId };

    if (cursor) {
        try {
            const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
            const [cursorCreatedAtStr, cursorIdStr] = decodedCursor.split("|");
            
            const cursorCreatedAt = new Date(parseInt(cursorCreatedAtStr, 10));
            const cursorId = mongoose.Types.ObjectId.createFromHexString(cursorIdStr);

            // Fetch messages strictly older than the cursor
            query.$or = [
                { createdAt: { $lt: cursorCreatedAt } },
                { createdAt: cursorCreatedAt, _id: { $lt: cursorId } }
            ];
        } catch (e) {
            return res.status(400).json({ success: false, message: "Invalid cursor" });
        }
    }

    // Messages are fetched newest first (reverse chronological order)
    const messages = await Message.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(actualLimit + 1) // Fetch one extra to determine if there's a next page
        .lean(); // Use lean to easily sanitize properties

    let nextCursor = null;

    if (messages.length > actualLimit) {
        const nextMessage = messages[actualLimit - 1]; // The last valid message in the current page limit
        const nextCursorStr = `${nextMessage.createdAt.getTime()}|${nextMessage._id.toString()}`;
        nextCursor = Buffer.from(nextCursorStr).toString("base64");
        messages.pop(); // Remove the extra message we fetched
    }

    // Sanitize soft-deleted messages before returning them to the client
    const sanitizedMessages = messages.map(msg => {
        if (msg.isDeleted) {
            return {
                ...msg,
                content: undefined,
                attachments: undefined,
                // Client UI will see isDeleted=true and display tombstone
            };
        }
        return msg;
    });

    res.status(200).json({
        success: true,
        data: sanitizedMessages,
        pagination: {
            limit: actualLimit,
            nextCursor,
            hasMore: nextCursor !== null
        }
    });
});

// @desc    Edit a message
// @route   PATCH /api/messages/:messageId
// @access  Private
export const editMessage = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);

    if (!message) {
        return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Verify sender
    if (message.senderId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "You can only edit your own messages" });
    }

    // Cannot edit deleted messages
    if (message.isDeleted) {
        return res.status(400).json({ success: false, message: "Cannot edit a deleted message" });
    }

    // We only allow editing text content for now based on the spec
    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    res.status(200).json({
        success: true,
        message: "Message edited successfully",
        data: message
    });
});

// @desc    Soft delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = asyncHandler(async (req, res) => {
    const messageId = req.params.messageId;

    const message = await Message.findById(messageId);

    if (!message) {
        return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Verify permissions: For Phase 1, only sender can delete (future: Owners/Admins)
    if (message.senderId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "You can only delete your own messages" });
    }

    if (message.isDeleted) {
        return res.status(400).json({ success: false, message: "Message is already deleted" });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = undefined;
    message.attachments = undefined;

    await message.save();

    // If this was the lastMessageId of the conversation, update it backward
    const conversation = await Conversation.findOne({ _id: message.conversationId, lastMessageId: message._id });
    
    if (conversation) {
        // Find the next most recent non-deleted message in this conversation
        const previousMessage = await Message.findOne({
            conversationId: message.conversationId,
            isDeleted: false
        }).sort({ createdAt: -1, _id: -1 });

        if (previousMessage) {
            conversation.lastMessageId = previousMessage._id;
            conversation.lastMessageAt = previousMessage.createdAt;
        } else {
            // No messages left
            conversation.lastMessageId = null;
            conversation.lastMessageAt = null;
        }
        await conversation.save();
    }

    res.status(200).json({
        success: true,
        message: "Message deleted successfully",
        data: message // sanitized state returned
    });
});
