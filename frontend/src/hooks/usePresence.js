import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Manages real-time presence (online/offline) state for all DM contacts.
 *
 * Design:
 *  - On every socket CONNECT (initial + reconnect), request a fresh presence
 *    snapshot via `presence:get` for all DM conversations.
 *  - Listen for `presence:state` snapshot responses and merge into state.
 *  - Listen for live `presence:online` / `presence:offline` events.
 *  - Clear all state on socket disconnect so there are never stale green dots.
 */
const usePresence = (socket, conversations) => {
    const [onlineUsers, setOnlineUsers] = useState(new Set());

    // Keep conversations in a ref so the connect handler can read
    // the latest value without needing to be re-registered on every render.
    const conversationsRef = useRef(conversations);
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    // ─── Helper ───────────────────────────────────────────────────────────────

    const isOnline = useCallback(
        (userId) => !!userId && onlineUsers.has(userId),
        [onlineUsers]
    );

    // ─── Request presence snapshot for all current DMs ────────────────────────

    const requestSnapshots = useCallback((sock) => {
        const convs = conversationsRef.current;
        if (!sock || !convs?.length) return;

        const dmConversations = convs.filter(c => c.type === 'private');
        dmConversations.forEach(dm => {
            sock.emit('presence:get', { conversationId: dm._id });
        });
    }, []);

    // ─── Socket event listeners ───────────────────────────────────────────────

    useEffect(() => {
        if (!socket) return;

        // ── Snapshot response ────────────────────────────────────────────────
        const handlePresenceState = ({ users }) => {
            if (!Array.isArray(users)) return;
            console.log('[Presence] presence:state received', users);

            setOnlineUsers(prev => {
                const next = new Set(prev);
                users.forEach(({ userId, status }) => {
                    if (status === 'online') {
                        next.add(userId);
                    } else {
                        next.delete(userId);
                    }
                });
                console.log('[Presence] onlineUsers after state update:', [...next]);
                return next;
            });
        };

        // ── Live transitions ─────────────────────────────────────────────────
        const handleOnline = ({ userId }) => {
            if (!userId) return;
            console.log('[Presence] presence:online →', userId);
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.add(userId);
                return next;
            });
        };

        const handleOffline = ({ userId }) => {
            if (!userId) return;
            console.log('[Presence] presence:offline →', userId);
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(userId);
                console.log('[Presence] onlineUsers after offline:', [...next]);
                return next;
            });
        };

        // ── Reconnect: clear stale state and re-request snapshots ────────────
        const handleConnect = () => {
            console.log('[Presence] socket connected — clearing state, re-requesting snapshots');
            setOnlineUsers(new Set());
            requestSnapshots(socket);
        };

        // ── Disconnect: immediately clear all green dots ─────────────────────
        const handleDisconnect = (reason) => {
            console.log('[Presence] socket disconnected —', reason, '— clearing onlineUsers');
            setOnlineUsers(new Set());
        };

        socket.on('presence:state',   handlePresenceState);
        socket.on('presence:online',  handleOnline);
        socket.on('presence:offline', handleOffline);
        socket.on('connect',          handleConnect);
        socket.on('disconnect',       handleDisconnect);

        // Request initial snapshots right now (in case we missed the connect event)
        if (socket.connected) {
            requestSnapshots(socket);
        }

        return () => {
            socket.off('presence:state',   handlePresenceState);
            socket.off('presence:online',  handleOnline);
            socket.off('presence:offline', handleOffline);
            socket.off('connect',          handleConnect);
            socket.off('disconnect',       handleDisconnect);
        };
    }, [socket, requestSnapshots]);

    // ─── Re-request when new DM conversations are added ──────────────────────

    useEffect(() => {
        if (!socket?.connected || !conversations?.length) return;
        requestSnapshots(socket);
    }, [conversations, socket, requestSnapshots]);

    return { isOnline };
};

export default usePresence;
