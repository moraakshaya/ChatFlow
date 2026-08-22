import React, { useState, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSocket } from '../context/SocketContext';
import useConversations from '../hooks/useConversations';
import useMembership from '../hooks/useMembership';
import usePresence from '../hooks/usePresence';
import useNotifications from '../hooks/useNotifications';
import CreateChannelModal from './CreateChannelModal';
import NewDMModal from './NewDMModal';
import InviteMembersModal from './InviteMembersModal';
import NotificationsPanel from './NotificationsPanel';
import SettingsModal from './SettingsModal';
import SidebarContextMenu from './SidebarContextMenu';
import GlobalSearchModal from './GlobalSearchModal';
import CreateProjectModal from './CreateProjectModal';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import ManageProjectWorkspaceModal from './ManageProjectWorkspaceModal';
import { 
    Hash, 
    Settings, 
    LogOut,
    ChevronDown,
    Plus,
    Search,
    Lock,
    UserPlus,
    Bell,
    Archive,
    Pin,
    BellOff,
    FolderPlus,
    Briefcase
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
    const { workspaces, activeWorkspace, switchWorkspace, activeProject, projects, switchProject } = useWorkspace();
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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Right-click context menu state
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, conversationId: null });

    // Membership data (isMuted, isPinned per conversation)
    const { memberships, toggleMute, togglePin } = useMembership();

    const handleContextMenu = useCallback((e, conversationId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ visible: true, x: e.pageX, y: e.pageY, conversationId });
    }, []);

    const closeContextMenu = useCallback(() => {
        setContextMenu({ visible: false, x: 0, y: 0, conversationId: null });
    }, []);

    // Filter conversations by type and status
    const allChannels = conversations.filter(c => c.type === 'channel' || c.type === 'private_channel' || c.type === 'group');

    // Sort active channels: pinned first, then by name
    const channels = allChannels
        .filter(c => c.status !== 'archived')
        .sort((a, b) => {
            const aPinned = memberships[a._id]?.isPinned ? 1 : 0;
            const bPinned = memberships[b._id]?.isPinned ? 1 : 0;
            return bPinned - aPinned;
        });
    const archivedChannels = allChannels.filter(c => c.status === 'archived');

    // Sort DMs: pinned first
    const directMessages = conversations
        .filter(c => c.type === 'private')
        .sort((a, b) => {
            const aPinned = memberships[a._id]?.isPinned ? 1 : 0;
            const bPinned = memberships[b._id]?.isPinned ? 1 : 0;
            return bPinned - aPinned;
        });

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
                {isDropdownOpen && (
                    <div className="absolute top-16 left-2 right-2 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 overflow-hidden py-1 max-h-[70vh] overflow-y-auto">
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                            Workspaces
                            {isAdminOrOwner && <button onClick={() => {setIsCreateWorkspaceOpen(true); setIsDropdownOpen(false);}} className="hover:text-white"><Plus size={14} /></button>}
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
                        
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                            Projects
                            {isAdminOrOwner && <button onClick={() => {setIsCreateProjectOpen(true); setIsDropdownOpen(false);}} className="hover:text-white"><Plus size={14} /></button>}
                        </div>
                        {projects?.map(p => (
                            <button
                                key={p._id}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${activeProject?._id === p._id ? 'text-indigo-400 font-medium' : 'text-gray-200'}`}
                                onClick={() => {
                                    switchProject(p);
                                    setIsDropdownOpen(false);
                                }}
                            >
                                <FolderPlus size={14} className={activeProject?._id === p._id ? 'text-indigo-400' : 'text-gray-400'} />
                                <span className="truncate">{p.name}</span>
                            </button>
                        ))}

                        <div className="border-t border-gray-700 my-1"></div>
                        
                        {activeProject && isAdminOrOwner && (
                            <button
                                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center gap-2"
                                onClick={() => {
                                    setIsManageModalOpen(true);
                                    setIsDropdownOpen(false);
                                }}
                            >
                                <Settings size={14} className="text-gray-400" />
                                <span>Manage Project</span>
                            </button>
                        )}

                        {isAdminOrOwner && (
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
                        )}
                    </div>
                )}

                {/* Global Search */}
                <div className="p-4">
                    <button 
                        onClick={() => setIsSearchModalOpen(true)}
                        className="w-full relative flex items-center bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 rounded-md pl-3 pr-2 py-2 border border-transparent transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 group"
                    >
                        <Search size={16} className="text-gray-500 group-hover:text-gray-400 mr-2 shrink-0" />
                        <span className="truncate">Search...</span>
                        <div className="ml-auto flex gap-1">
                            <kbd className="hidden sm:inline-block font-sans text-[10px] bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-500">⌘</kbd>
                            <kbd className="hidden sm:inline-block font-sans text-[10px] bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-gray-500">K</kbd>
                        </div>
                    </button>
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
                                    channels.map(channel => {
                                        const mship = memberships[channel._id];
                                        const isPinned = mship?.isPinned ?? false;
                                        const isMuted = mship?.isMuted ?? false;
                                        return (
                                            <li key={channel._id}>
                                                <NavLink
                                                    to={`/channel/${channel._id}`}
                                                    onContextMenu={(e) => handleContextMenu(e, channel._id)}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                                                            isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                                                        } ${isPinned ? 'border-l-2 border-indigo-500 pl-1.5' : ''}`
                                                    }
                                                >
                                                    {channel.type === 'private_channel' ? (
                                                        <Lock size={14} className="text-gray-500 shrink-0" />
                                                    ) : (
                                                        <Hash size={16} className="text-gray-500 shrink-0" />
                                                    )}
                                                    <span className={`truncate text-sm flex-1 ${isMuted ? 'opacity-60' : ''}`}>
                                                        {channel.name}
                                                    </span>
                                                    <span className="flex items-center gap-1 shrink-0">
                                                        {isPinned && <Pin size={11} className="text-indigo-400" />}
                                                        {isMuted && <BellOff size={11} className="text-gray-500" />}
                                                        {renderBadge(channel._id)}
                                                    </span>
                                                </NavLink>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </div>

                        {/* Archived Channels Section — collapsible, hidden by default */}
                        {archivedChannels.length > 0 && (
                            <div>
                                <button
                                    className="flex items-center justify-between w-full px-2 mb-1 text-gray-500 hover:text-gray-400 transition-colors group"
                                    onClick={() => setIsArchivedExpanded(prev => !prev)}
                                >
                                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                                        <Archive size={12} />
                                        Archived
                                        <span className="text-[10px] font-normal bg-gray-800 px-1.5 py-0.5 rounded-full">{archivedChannels.length}</span>
                                    </span>
                                    <ChevronDown
                                        size={12}
                                        className={`transition-transform ${isArchivedExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {isArchivedExpanded && (
                                    <ul className="space-y-0.5">
                                        {archivedChannels.map(channel => (
                                            <li key={channel._id}>
                                                <NavLink
                                                    to={`/channel/${channel._id}`}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors opacity-60 italic ${
                                                            isActive ? 'bg-gray-800 text-white opacity-100' : 'text-gray-400 hover:bg-gray-800 hover:opacity-80'
                                                        }`
                                                    }
                                                >
                                                    <Archive size={14} className="text-gray-600 shrink-0" />
                                                    <span className="truncate text-sm">{channel.name}</span>
                                                </NavLink>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

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
                                        const mship = memberships[dm._id];
                                        const isPinned = mship?.isPinned ?? false;
                                        const isMuted = mship?.isMuted ?? false;
                                        
                                        return (
                                            <li key={dm._id}>
                                                <NavLink
                                                    to={`/channel/${dm._id}`}
                                                    onContextMenu={(e) => handleContextMenu(e, dm._id)}
                                                    className={({ isActive }) =>
                                                        `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                                                            isActive ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800'
                                                        } ${isPinned ? 'border-l-2 border-indigo-500 pl-1.5' : ''}`
                                                    }
                                                >
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-[10px] font-medium text-white">
                                                            {initial}
                                                        </div>
                                                        {/* Presence dot */}
                                                        <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                                                            {online && (
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                                                            )}
                                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-gray-900 ${
                                                                online ? 'bg-green-500' : 'bg-gray-600'
                                                            }`} />
                                                        </span>
                                                    </div>
                                                    <span className={`truncate text-sm flex-1 ${isMuted ? 'opacity-60' : ''}`}>{dmName}</span>
                                                    <span className="flex items-center gap-1 shrink-0">
                                                        {isPinned && <Pin size={11} className="text-indigo-400" />}
                                                        {isMuted && <BellOff size={11} className="text-gray-500" />}
                                                        {renderBadge(dm._id)}
                                                    </span>
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
                        
                        <button 
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors" 
                            title="Settings"
                        >
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

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {/* Right-click context menu */}
            <SidebarContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                conversationId={contextMenu.conversationId}
                isMuted={memberships[contextMenu.conversationId]?.isMuted ?? false}
                isPinned={memberships[contextMenu.conversationId]?.isPinned ?? false}
                onPin={togglePin}
                onMute={toggleMute}
                onClose={closeContextMenu}
            />

            <GlobalSearchModal
                isOpen={isSearchModalOpen}
                onClose={() => setIsSearchModalOpen(false)}
            />

            <CreateProjectModal 
                isOpen={isCreateProjectOpen} 
                onClose={() => setIsCreateProjectOpen(false)} 
            />
            <CreateWorkspaceModal 
                isOpen={isCreateWorkspaceOpen} 
                onClose={() => setIsCreateWorkspaceOpen(false)} 
            />
            <ManageProjectWorkspaceModal 
                isOpen={isManageModalOpen} 
                onClose={() => setIsManageModalOpen(false)} 
            />
        </>
    );
};

export default Sidebar;
