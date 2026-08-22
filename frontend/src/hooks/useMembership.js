import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useWorkspace } from '../context/WorkspaceContext';

/**
 * useMembership — fetches the current user's membership data for all conversations.
 *
 * Returns a `memberships` map keyed by conversationId:
 *   { [conversationId]: { _id, isMuted, isPinned } }
 *
 * Also exposes toggleMute(conversationId) and togglePin(conversationId) which
 * optimistically update local state and call the backend patch routes.
 */
const useMembership = () => {
    const { activeWorkspace } = useWorkspace();

    // Map of conversationId -> { _id (membershipId), isMuted, isPinned }
    const [memberships, setMemberships] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const fetchMemberships = useCallback(async () => {
        if (!activeWorkspace) {
            setMemberships({});
            return;
        }
        setIsLoading(true);
        try {
            const response = await api.get('/conversation-members/me');
            if (response.data.success) {
                const map = {};
                response.data.data.forEach(item => {
                    // Each item is a ConversationMember document
                    const convId = item.conversationId?.toString?.() || item.conversationId;
                    map[convId] = {
                        _id: item._id,
                        isMuted: item.isMuted ?? false,
                        isPinned: item.isPinned ?? false,
                    };
                });
                setMemberships(map);
            }
        } catch (err) {
            console.error('Failed to fetch memberships:', err);
        } finally {
            setIsLoading(false);
        }
    }, [activeWorkspace]);

    useEffect(() => {
        fetchMemberships();
    }, [fetchMemberships]);

    /**
     * Toggles the muted state for a conversation.
     * Optimistically updates local state before the API call completes.
     */
    const toggleMute = useCallback(async (conversationId) => {
        const membership = memberships[conversationId];
        if (!membership) return;

        const newMuted = !membership.isMuted;

        // Optimistic update
        setMemberships(prev => ({
            ...prev,
            [conversationId]: { ...prev[conversationId], isMuted: newMuted }
        }));

        try {
            await api.patch(`/conversation-members/${membership._id}/mute`, { isMuted: newMuted });
        } catch (err) {
            console.error('Failed to toggle mute:', err);
            // Revert on error
            setMemberships(prev => ({
                ...prev,
                [conversationId]: { ...prev[conversationId], isMuted: membership.isMuted }
            }));
        }
    }, [memberships]);

    /**
     * Toggles the pinned state for a conversation.
     * Optimistically updates local state before the API call completes.
     */
    const togglePin = useCallback(async (conversationId) => {
        const membership = memberships[conversationId];
        if (!membership) return;

        const newPinned = !membership.isPinned;

        // Optimistic update
        setMemberships(prev => ({
            ...prev,
            [conversationId]: { ...prev[conversationId], isPinned: newPinned }
        }));

        try {
            await api.patch(`/conversation-members/${membership._id}/pin`, { isPinned: newPinned });
        } catch (err) {
            console.error('Failed to toggle pin:', err);
            // Revert on error
            setMemberships(prev => ({
                ...prev,
                [conversationId]: { ...prev[conversationId], isPinned: membership.isPinned }
            }));
        }
    }, [memberships]);

    return {
        memberships,
        isLoading,
        toggleMute,
        togglePin,
        refetch: fetchMemberships,
    };
};

export default useMembership;
