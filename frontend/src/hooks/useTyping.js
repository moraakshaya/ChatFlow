import { useState, useEffect, useRef, useCallback } from 'react';

const EMIT_COOLDOWN_MS = 2000;   // min gap between typing_start emits
const CLIENT_IDLE_MS   = 3000;   // stop typing after 3 s of no keystrokes
const SAFETY_CLEAR_MS  = 6000;   // auto-clear stale "X is typing" if no stop event

/**
 * Manages typing indicator state for a conversation.
 *
 * @param {object} socket  - The Socket.IO client instance
 * @param {string} conversationId - The active conversation's _id
 * @param {object} currentUser    - The logged-in user object
 *
 * @returns {{
 *   typingUsers: Map<string, string>,
 *   onInputChange: () => void,
 *   stopTyping: () => void
 * }}
 */
const useTyping = (socket, conversationId, currentUser) => {
    // Map<userId, displayName> of people currently typing
    const [typingUsers, setTypingUsers] = useState(new Map());

    // Tracks whether we've recently emitted typing_start
    const isTypingRef       = useRef(false);
    const lastEmitRef       = useRef(0);
    const idleTimerRef      = useRef(null);

    // Per-user safety timers (auto-clear if typing_stop never arrives)
    const safetyTimersRef   = useRef(new Map()); // userId → NodeJS.Timeout

    // ─── Emit helpers ───────────────────────────────────────────────────────

    const emitStart = useCallback(() => {
        if (!socket || !conversationId) return;
        const now = Date.now();
        if (now - lastEmitRef.current < EMIT_COOLDOWN_MS) return; // throttle
        lastEmitRef.current = now;
        isTypingRef.current = true;
        socket.emit('typing_start', { conversationId });
    }, [socket, conversationId]);

    const emitStop = useCallback(() => {
        if (!socket || !conversationId) return;
        if (!isTypingRef.current) return; // nothing to stop
        isTypingRef.current = false;
        lastEmitRef.current = 0;          // reset cooldown so next key re-fires immediately
        socket.emit('typing_stop', { conversationId });
    }, [socket, conversationId]);

    // ─── Exposed to ChatWindow ───────────────────────────────────────────────

    /**
     * Call this inside the textarea's onChange handler.
     * Emits typing_start (throttled) and resets the idle timer.
     */
    const onInputChange = useCallback(() => {
        emitStart();

        // Reset idle timer
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => {
            emitStop();
        }, CLIENT_IDLE_MS);
    }, [emitStart, emitStop]);

    /**
     * Call this when the user sends / clears the message.
     * Emits typing_stop immediately and clears all timers.
     */
    const stopTyping = useCallback(() => {
        clearTimeout(idleTimerRef.current);
        emitStop();
    }, [emitStop]);

    // ─── Incoming event listeners ────────────────────────────────────────────

    useEffect(() => {
        if (!socket || !conversationId) return;

        const clearSafetyTimer = (userId) => {
            const t = safetyTimersRef.current.get(userId);
            if (t) {
                clearTimeout(t);
                safetyTimersRef.current.delete(userId);
            }
        };

        const removeUser = (userId) => {
            clearSafetyTimer(userId);
            setTypingUsers(prev => {
                if (!prev.has(userId)) return prev;
                const next = new Map(prev);
                next.delete(userId);
                return next;
            });
        };

        const handleTypingStart = ({ conversationId: convId, userId, userName }) => {
            if (convId !== conversationId) return;
            if (userId === currentUser?._id) return; // ignore self

            // Resolve display name: server may send userName, or fall back to userId
            const displayName = userName || userId;

            // Reset safety timer
            clearSafetyTimer(userId);
            const safety = setTimeout(() => removeUser(userId), SAFETY_CLEAR_MS);
            safetyTimersRef.current.set(userId, safety);

            setTypingUsers(prev => {
                const next = new Map(prev);
                next.set(userId, displayName);
                return next;
            });
        };

        const handleTypingStop = ({ conversationId: convId, userId }) => {
            if (convId !== conversationId) return;
            removeUser(userId);
        };

        socket.on('typing_start', handleTypingStart);
        socket.on('typing_stop',  handleTypingStop);

        return () => {
            socket.off('typing_start', handleTypingStart);
            socket.off('typing_stop',  handleTypingStop);
        };
    }, [socket, conversationId, currentUser?._id]);

    // ─── Cleanup on conversation switch ─────────────────────────────────────

    useEffect(() => {
        return () => {
            clearTimeout(idleTimerRef.current);
            // Stop any lingering safety timers
            safetyTimersRef.current.forEach(t => clearTimeout(t));
            safetyTimersRef.current.clear();
            // Always emit stop when leaving a conversation
            emitStop();
            setTypingUsers(new Map());
        };
        // We intentionally only run this on conversationId change / unmount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    return { typingUsers, onInputChange, stopTyping };
};

export default useTyping;
