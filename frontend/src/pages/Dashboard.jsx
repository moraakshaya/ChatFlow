import React from 'react';
import { MessageSquare, FolderPlus, Briefcase } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import CreateProjectModal from '../components/CreateProjectModal';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import CreateChannelModal from '../components/CreateChannelModal';
import InviteMembersModal from '../components/InviteMembersModal';

const Dashboard = () => {
    const { projects, workspaces, activeProject, activeWorkspace, isLoading } = useWorkspace();

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 h-full p-8 text-center transition-colors">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // STATE 1: No Projects
    if (projects.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 h-full p-8 text-center relative transition-colors">
                <div className="max-w-md w-full">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100 dark:border-blue-800/50">
                        <FolderPlus size={40} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome to ChatPlatform!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        To get started, you need to create your first Project. Projects help you organize different teams or large initiatives.
                    </p>
                </div>
                
                {/* We render the modal inline, forcing it to be open and un-closable */}
                <CreateProjectModal isOpen={true} onClose={null} />
            </div>
        );
    }

    // STATE 2: Has Project, No Workspaces
    if (activeProject && workspaces.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 h-full p-8 text-center relative transition-colors">
                <div className="max-w-md w-full">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100 dark:border-blue-800/50">
                        <Briefcase size={40} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Project Created!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        Now, let's create your first Workspace inside <strong className="text-gray-700 dark:text-gray-300">{activeProject.name}</strong>. Workspaces are where your channels and conversations live.
                    </p>
                </div>
                
                <CreateWorkspaceModal isOpen={true} onClose={null} />
            </div>
        );
    }

    const [isCreateChannelOpen, setIsCreateChannelOpen] = React.useState(false);
    const [isInviteOpen, setIsInviteOpen] = React.useState(false);

    // STATE 3: Has Workspace, ready to chat
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 h-full p-8 text-center transition-colors">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-blue-100 dark:border-blue-800/50">
                <MessageSquare size={40} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to {activeWorkspace?.name || 'ChatPlatform'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
                Select a channel or direct message from the sidebar to start collaborating with your team.
            </p>
            
            <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                <button 
                    onClick={() => setIsCreateChannelOpen(true)}
                    className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all text-sm font-medium text-gray-700 dark:text-gray-200 text-left flex flex-col gap-1 group"
                >
                    <span className="text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">Create a Channel</span>
                    <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">Start a new topic</span>
                </button>
                <button 
                    onClick={() => setIsInviteOpen(true)}
                    className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-sm transition-all text-sm font-medium text-gray-700 dark:text-gray-200 text-left flex flex-col gap-1 group"
                >
                    <span className="text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">Invite People</span>
                    <span className="text-gray-400 dark:text-gray-500 font-normal text-xs">Grow your workspace</span>
                </button>
            </div>

            {/* Modals */}
            <CreateChannelModal 
                isOpen={isCreateChannelOpen} 
                onClose={() => setIsCreateChannelOpen(false)} 
                onChannelCreated={() => setIsCreateChannelOpen(false)}
            />
            <InviteMembersModal 
                isOpen={isInviteOpen} 
                onClose={() => setIsInviteOpen(false)} 
            />
        </div>
    );
};

export default Dashboard;
