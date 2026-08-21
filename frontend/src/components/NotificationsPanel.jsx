import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, X, MessageSquare } from 'lucide-react';

const NotificationsPanel = ({ 
    isOpen, 
    onClose, 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
}) => {
    const navigate = useNavigate();
    const panelRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                // Check if the click is on the bell button to avoid double toggling
                if (event.target.closest('#notification-bell-btn')) return;
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification._id);
        }
        if (notification.conversation) {
            navigate(`/channel/${notification.conversation}`);
            onClose();
        }
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div 
            ref={panelRef}
            className="absolute bottom-16 left-4 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden"
            style={{ maxHeight: '400px' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-800/50">
                <h3 className="font-semibold text-gray-200 text-sm">Notifications</h3>
                <div className="flex items-center gap-2">
                    {notifications.some(n => !n.isRead) && (
                        <button 
                            onClick={markAllAsRead}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            Mark all read
                        </button>
                    )}
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-0.5 rounded-md hover:bg-gray-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center text-gray-500">
                        <Bell size={24} className="mb-2 opacity-20" />
                        <p className="text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-800">
                        {notifications.map(notification => (
                            <div 
                                key={notification._id}
                                className={`p-3 hover:bg-gray-800 transition-colors cursor-pointer group flex items-start gap-3 ${
                                    !notification.isRead ? 'bg-gray-800/20' : ''
                                }`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                {/* Icon / Avatar based on type */}
                                <div className="mt-1 shrink-0">
                                    {notification.actor ? (
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                            {notification.actor.fullName?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                                            <MessageSquare size={14} />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <p className={`text-sm truncate pr-2 ${!notification.isRead ? 'text-gray-100 font-medium' : 'text-gray-300'}`}>
                                            {notification.title}
                                        </p>
                                        <span className="text-[10px] text-gray-500 shrink-0 whitespace-nowrap">
                                            {formatTime(notification.createdAt)}
                                        </span>
                                    </div>
                                    <p className={`text-xs line-clamp-2 ${!notification.isRead ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {notification.message}
                                    </p>
                                </div>
                                
                                {/* Hover Actions */}
                                <div className="flex flex-col items-center justify-start opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0 ml-1">
                                    {!notification.isRead && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(notification._id);
                                            }}
                                            className="p-1 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(notification._id);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                                        title="Delete notification"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPanel;
