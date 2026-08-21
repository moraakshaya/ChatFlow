import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSocket } from '../context/SocketContext';
import useConversations from '../hooks/useConversations';
import usePresence from '../hooks/usePresence';
import useNotifications from '../hooks/useNotifications';
import CreateChannelModal from './CreateChannelModal';
import NewDMModal from './NewDMModal';
import InviteMembersModal from './InviteMembersModal';
import NotificationsPanel from './NotificationsPanel';
import { 
    Hash, 
    MessageSquare, 
    Settings, 
    LogOut,
    ChevronDown,
    Plus,
    Search,
    Lock,
    UserPlus,
    Bell
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { workspaces, activeWorkspace, switchWorkspace, activeProject } = useWorkspace();
    const { socket } = useSocket();
    const { conversations, unreadCounts, isLoading, error, refetch } = useConversations();
    const { isOnline } = usePresence(socket, conversations);
    
    // Notifications
    const { 
        notifications, 
        unreadCount: notificationsUnread, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification 
    } = useNotifications();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNewDMModalOpen, setIsNewDMModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Filter conversations by type
    const channels = conversations.filter(c => c.type === 'channel' || c.type === 'private_channel' || c.type === 'group');
    const directMessages = conversations.filter(c => c.type === 'private');

    // Helper function to render the badge
    const renderBadge = (conversationId) => {
        const count = unreadCounts[conversationId];
        if (!count || count === 0) return null;
        
        return (
            <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {count > 99 ? '99+' : count}
            </span>
        );
    };

    return (
        <>
            <div className="w-64 bg-gray-900 text-gray-300 flex flex-col h-full flex-shrink-0 relative">
                {/* Header / Workspace Selector */}
                <div 
                    className="h-16 flex items-center justify-between px-4 hover:bg-gray-800 cursor-pointer border-b border-gray-800 transition-colors relative"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                    <div className="flex-1 truncate">
                        <h1 className="font-bold text-white text-lg truncate">{activeWorkspace?.name || 'No Workspace'}</h1>
                        <p className="text-xs text-gray-500 truncate">{activeProject?.name || user?.organizationName}</p>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Workspace Dropdown */}
                {isDropdownOpen && workspaces.length > 0 && (
                    <div className="absolute top-16 left-2 right-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 overflow-hidden py-1">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Switch Workspace
                        </div>
                        {workspaces.map(ws => (
                            <button
                                key={ws._id}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${activeWorkspace?._id === ws._id ? 'text-blue-400 font-medium' : 'text-gray-200'}`}
                                onClick={() => {
                                    switchWorkspace(ws);
                                    setIsDropdownOpen(false);
                                }}
                            >
                                <div className={`w-2 h-2 rounded-full ${activeWorkspace?._id === ws._id ? 'bg-blue-500' : 'bg-gray-600'}`}></div>
                                <span className="truncate">{ws.name}</span>
                            </button>
                        ))}
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                            className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                            onClick={() => {
                                setIsInviteModalOpen(true);
                                setIsDropdownOpen(false);
                            }}
                        >
                            <UserPlus size={14} className="text-gray-400" />
                            <span>Invite Teammates</span>
                        </button>
                    </div>
                )}

                {/* Global Search */}
                <div className="p-4">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            className="w-full bg-gray-800 text-sm text-white rounded-md pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 border border-transparent transition-all placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Loading / Error States */}
                {isLoading && activeWorkspace && (
                    <div className="flex-1 flex justify-center pt-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-500"></div>
                    </div>
                )}
                
                {error && !isLoading && activeWorkspace && (
                    <div className="p-4 text-xs text-red-400 text-center">
                        {error}
                        <button onClick={refetch} className="block w-full mt-2 text-blue-400 hover:underline">Retry</button>
                    </div>
                )}

                {/* Hide channels if no workspace is active */}
                {!activeWorkspace && !isLoading && (
                    <div className="flex-1 p-4 text-center text-sm text-gray-500 mt-10">
                        Please select or create a workspace to view channels.
                    </div>
                )}

                {/* Channels & DMs (Scrollable Area) */}
                {!isLoading && !error && activeWorkspace && (
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-6">
                        
                        {/* Channels Section */}
                        <div>
                            <div className="flex items-center justify-between px-2 group cursor-pointer text-gray-400 hover:text-gray-200 mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Channels</span>
                                <button 
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-800 p-0.5 rounded"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            <ul className="space-y-0.5">
                                {channels.length === 0 ? (
                                    <li className="px-2 py-1 text-xs text-gray-500 italic">No channels yet</li>
                                ) : (
                                    channels.map(channel => (
                                        <li key={channel._id}>
                                            <NavLink
                                                to={`/channel/${channel._id}`}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                                                        isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                                                    }`
                                                }
                                            >
                                                {channel.type === 'private_channel' ? (
                                                    <Lock size={14} className="text-gray-500" />
                                                ) : (
                                                    <Hash size={16} className="text-gray-500" />
                                                )}
                                                <span className="truncate text-sm">{channel.name}</span>
                                                {renderBadge(channel._id)}
                                            </NavLink>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* Direct Messages Section */}
                        <div>
                            <div className="flex items-center justify-between px-2 group cursor-pointer text-gray-400 hover:text-gray-200 mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider">Direct Messages</span>
                                <button 
                                    onClick={() => setIsNewDMModalOpen(true)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-800 p-0.5 rounded"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                            <ul className="space-y-0.5">
                                {directMessages.length === 0 ? (
                                    <li className="px-2 py-1 text-xs text-gray-500 italic">No direct messages yet</li>
                                ) : (
                                    directMessages.map(dm => {
                                        const targetUser = dm.targetUser;
                                        const dmName = targetUser?.fullName || "Unknown User";
                                        const initial = dmName.charAt(0).toUpperCase();
                                        const online = isOnline(targetUser?._id);
                                        
                                        return (
                                            <li key={dm._id}>
                                                <NavLink
                                                    to={`/channel/${dm._id}`}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                                                            isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                                                        }`
                                                    }
                                                >
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-[10px] font-medium text-white">
                                                            {initial}
                                                        </div>
                                                        {/* Presence dot */}
                                                        <span className={`absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5`}>
                                                            {online && (
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                                                            )}
                                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-gray-900 ${
                                                                online ? 'bg-green-500' : 'bg-gray-600'
                                                            }`} />
                                                        </span>
                                                    </div>
                                                    <span className="truncate text-sm">{dmName}</span>
                                                    {renderBadge(dm._id)}
                                                </NavLink>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </div>

                    </div>
                )}

                {/* User Profile Footer */}
                <div className="p-4 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 truncate">
                        <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user?.fullName?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="truncate">
                            <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
                            <p className="text-xs text-gray-500 truncate capitalize">{user?.role || 'Member'}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Notifications Bell */}
                        <div className="relative">
                            <button 
                                id="notification-bell-btn"
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className={`p-1.5 rounded-md transition-colors ${
                                    isNotificationsOpen ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                                title="Notifications"
                            >
                                <Bell size={16} />
                                {notificationsUnread > 0 && (
                                    <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-gray-950"></span>
                                )}
                            </button>
                        </div>
                        
                        <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors" title="Settings">
                            <Settings size={16} />
                        </button>
                        <button onClick={logout} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors" title="Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <NotificationsPanel 
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                deleteNotification={deleteNotification}
            />

            {/* Modals */}
            <CreateChannelModal 
                isOpen={isCreateModalOpen} 
                onClose={() => setIsCreateModalOpen(false)} 
                onChannelCreated={refetch}
            />
            
            <NewDMModal
                isOpen={isNewDMModalOpen}
                onClose={() => setIsNewDMModalOpen(false)}
                onDMCreated={(newDM) => {
                    refetch();
                }}
            />
            
            <InviteMembersModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </>
    );
};

export default Sidebar;
