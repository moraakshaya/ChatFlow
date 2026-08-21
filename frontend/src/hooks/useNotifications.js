import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';

const useNotifications = () => {
    const { socket } = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setError(err.response?.data?.message || 'Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification) => {
            setNotifications(prev => [notification, ...prev]);
        };

        const handleUnreadUpdate = ({ conversationId, unreadCount }) => {
            if (unreadCount === 0) {
                // When a conversation is marked as read, mark all its notifications as read
                setNotifications(prev => prev.map(n => 
                    (n.conversation === conversationId && !n.isRead) ? { ...n, isRead: true } : n
                ));
            }
        };

        socket.on('notification:new', handleNewNotification);
        socket.on('unread:update', handleUnreadUpdate);

        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('unread:update', handleUnreadUpdate);
        };
    }, [socket]);

    const markAsRead = useCallback(async (id) => {
        try {
            setNotifications(prev => 
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            await api.patch(`/notifications/${id}/read`);
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            await api.patch('/notifications/read-all');
        } catch (err) {
            console.error("Failed to mark all notifications as read", err);
        }
    }, []);

    const deleteNotification = useCallback(async (id) => {
        try {
            setNotifications(prev => prev.filter(n => n._id !== id));
            await api.delete(`/notifications/${id}`);
        } catch (err) {
            console.error("Failed to delete notification", err);
        }
    }, []);

    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetch: fetchNotifications
    };
};

export default useNotifications;
