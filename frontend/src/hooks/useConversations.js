import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSocket } from '../context/SocketContext';

const useConversations = () => {
    const { activeWorkspace } = useWorkspace();
    const { socket } = useSocket();
    const [conversations, setConversations] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchConversations = useCallback(async () => {
        if (!activeWorkspace) {
            setConversations([]);
            setUnreadCounts({});
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Fetch conversations and unread counts in parallel
            const [conversationsRes, unreadRes] = await Promise.all([
                api.get(`/conversations/workspace/${activeWorkspace._id}`),
                api.get('/conversations/unread')
            ]);

            if (conversationsRes.data.success) {
                setConversations(conversationsRes.data.data);
            }

            if (unreadRes.data.success) {
                // Map the unread counts array into a dictionary { conversationId: count } for easy lookup
                const unreadDict = {};
                unreadRes.data.data.forEach(item => {
                    // Backend returns { conversationId, unreadCount }
                    if (item.unreadCount > 0) {
                        unreadDict[item.conversationId] = item.unreadCount;
                    }
                });
                setUnreadCounts(unreadDict);
            }
        } catch (err) {
            console.error("Failed to fetch conversations:", err);
            setError(err.response?.data?.message || 'Failed to load conversations');
        } finally {
            setIsLoading(false);
        }
    }, [activeWorkspace]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    // Real-time: listen for unread:update from the backend.
    // The backend emits this to user_{userId} room whenever:
    //   - A new message arrives in one of the user's conversations (count goes up)
    //   - The user marks a conversation as read (count goes to 0)
    useEffect(() => {
        if (!socket) return;

        const handleUnreadUpdate = ({ conversationId, unreadCount }) => {
            setUnreadCounts(prev => ({
                ...prev,
                [conversationId]: unreadCount
            }));
        };

        socket.on('unread:update', handleUnreadUpdate);

        return () => {
            socket.off('unread:update', handleUnreadUpdate);
        };
    }, [socket]);

    const markConversationAsRead = useCallback(async (conversationId) => {
        if (!conversationId) return;
        try {
            // Optimistic: clear the badge instantly in the UI
            setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }));
            // Then confirm with the server (which also emits unread:update with count 0 via socket)
            await api.patch(`/conversations/${conversationId}/read`);
        } catch (err) {
            console.error('Failed to mark conversation as read:', err);
        }
    }, []);

    return {
        conversations,
        unreadCounts,
        isLoading,
        error,
        refetch: fetchConversations,
        markConversationAsRead
    };
};

export default useConversations;
