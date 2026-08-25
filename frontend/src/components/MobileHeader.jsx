import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import useNotifications from '../hooks/useNotifications';
import { ChevronDown, ChevronRight, Bell, Settings, LogOut, Plus, FolderPlus, UserPlus } from 'lucide-react';

import NotificationsPanel from './NotificationsPanel';
import SettingsModal from './SettingsModal';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import CreateProjectModal from './CreateProjectModal';
import InviteMembersModal from './InviteMembersModal';
import ManageProjectWorkspaceModal from './ManageProjectWorkspaceModal';

const MobileHeader = ({ isSidebarOpen, onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';
    const { workspaces, activeWorkspace, switchWorkspace, activeProject, projects, switchProject } = useWorkspace();
    
    const { 
        notifications, 
        unreadCount: notificationsUnread, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification 
    } = useNotifications();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    return (
        <>
            <div className="md:hidden h-14 bg-gray-950 text-gray-300 flex items-center justify-between px-4 border-b border-gray-800 z-50 flex-shrink-0 relative">
                {/* Left Side: Toggle Arrow & Workspace Name */}
                <div className="flex items-center gap-2 max-w-[60%]">
                    <button 
                        onClick={onToggleSidebar}
                        className="p-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-white transition-colors mr-2 shadow-sm"
                    >
                        <ChevronRight size={20} strokeWidth={2.5} className={`transform transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    <div 
                        className="flex-1 flex items-center gap-1 cursor-pointer truncate"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <div className="truncate">
                            <h1 className="font-bold text-white text-base truncate leading-tight">{activeWorkspace?.name || 'No Workspace'}</h1>
                            {activeProject && <p className="text-xs text-gray-300 truncate leading-tight mt-0.5">{activeProject.name}</p>}
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Right Side: Profile Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`p-1.5 rounded-md transition-colors relative ${
                            isNotificationsOpen ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        <Bell size={18} />
                        {notificationsUnread > 0 && (
                            <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-gray-950"></span>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                    >
                        <Settings size={18} />
                    </button>

                    <button 
                        onClick={logout} 
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
                    >
                        <LogOut size={18} />
                    </button>

                    <div className="w-7 h-7 ml-1 rounded-md bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {user?.fullName?.charAt(0).toUpperCase() || '?'}
                    </div>
                </div>

                {/* Workspace Dropdown */}
                {isDropdownOpen && (
                    <div className="absolute top-14 left-2 right-2 bg-gray-800 border border-gray-700 rounded-md shadow-2xl z-50 overflow-hidden py-1 max-h-[70vh] overflow-y-auto">
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
            </div>

            {/* Overlays / Modals */}
            {isDropdownOpen && (
                <div className="fixed inset-0 bg-transparent z-40 md:hidden" onClick={() => setIsDropdownOpen(false)} />
            )}

            <NotificationsPanel 
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notifications}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                deleteNotification={deleteNotification}
                position="top-right"
            />

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            
            <CreateWorkspaceModal 
                isOpen={isCreateWorkspaceOpen} 
                onClose={() => setIsCreateWorkspaceOpen(false)}
            />
            
            <CreateProjectModal 
                isOpen={isCreateProjectOpen} 
                onClose={() => setIsCreateProjectOpen(false)}
            />

            <ManageProjectWorkspaceModal
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
            />
            
            <InviteMembersModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </>
    );
};

export default MobileHeader;
