import React, { useState, useEffect } from 'react';
import { X, Folder, Briefcase, Trash2, Edit2, Check, XCircle } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

const ManageProjectWorkspaceModal = ({ isOpen, onClose }) => {
    const { 
        activeProject, 
        workspaces, 
        updateProject, 
        deleteProject, 
        updateWorkspace, 
        deleteWorkspace 
    } = useWorkspace();
    
    const [activeTab, setActiveTab] = useState('project'); // 'project' or 'workspaces'
    
    // Project form state
    const [projectName, setProjectName] = useState('');
    const [projectCode, setProjectCode] = useState('');
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [projectMessage, setProjectMessage] = useState({ type: '', text: '' });
    
    // Workspace editing state
    const [editingWsId, setEditingWsId] = useState(null);
    const [editWsName, setEditWsName] = useState('');
    const [editWsCode, setEditWsCode] = useState('');
    const [editWsDesc, setEditWsDesc] = useState('');

    useEffect(() => {
        if (isOpen && activeProject) {
            setProjectName(activeProject.name || '');
            setProjectCode(activeProject.code || '');
            setProjectMessage({ type: '', text: '' });
            setEditingWsId(null);
        }
    }, [isOpen, activeProject]);

    if (!isOpen || !activeProject) return null;

    const handleSaveProject = async (e) => {
        e.preventDefault();
        setProjectMessage({ type: '', text: '' });
        setIsSavingProject(true);

        try {
            await updateProject(activeProject._id, {
                name: projectName,
                code: projectCode
            });
            setProjectMessage({ type: 'success', text: 'Project updated successfully.' });
            setTimeout(() => setProjectMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setProjectMessage({ 
                type: 'error', 
                text: error.response?.data?.message || 'Failed to update project.' 
            });
        } finally {
            setIsSavingProject(false);
        }
    };

    const handleDeleteProject = async () => {
        if (window.confirm(`Are you sure you want to delete the project "${activeProject.name}"? This action cannot be undone.`)) {
            try {
                await deleteProject(activeProject._id);
                onClose(); // Close modal after successful delete, context handles switching
            } catch (error) {
                setProjectMessage({ 
                    type: 'error', 
                    text: error.response?.data?.message || 'Failed to delete project.' 
                });
            }
        }
    };

    const startEditWorkspace = (ws) => {
        setEditingWsId(ws._id);
        setEditWsName(ws.name);
        setEditWsCode(ws.code || '');
        setEditWsDesc(ws.description || '');
    };

    const cancelEditWorkspace = () => {
        setEditingWsId(null);
    };

    const handleSaveWorkspace = async (wsId) => {
        try {
            await updateWorkspace(wsId, {
                name: editWsName,
                code: editWsCode,
                description: editWsDesc
            });
            setEditingWsId(null);
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update workspace.');
        }
    };

    const handleDeleteWorkspace = async (wsId, wsName) => {
        if (window.confirm(`Are you sure you want to delete the workspace "${wsName}"?`)) {
            try {
                await deleteWorkspace(wsId);
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to delete workspace.');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl flex overflow-hidden max-h-[85vh] border border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                
                {/* Left Sidebar Menu */}
                <div className="w-64 bg-gray-950 border-r border-gray-800 p-4 flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-white mb-4 px-2">Manage Project</h2>
                    
                    <button 
                        onClick={() => setActiveTab('project')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'project' 
                            ? 'bg-blue-600/10 text-blue-400' 
                            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                        }`}
                    >
                        <Folder size={18} />
                        Project Settings
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('workspaces')}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'workspaces' 
                            ? 'bg-blue-600/10 text-blue-400' 
                            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'
                        }`}
                    >
                        <Briefcase size={18} />
                        Workspaces
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-gray-900 relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="p-8 flex-1 overflow-y-auto">
                        
                        {/* Project Settings Tab */}
                        {activeTab === 'project' && (
                            <div className="max-w-md animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white mb-6">Project Settings</h3>
                                
                                <form onSubmit={handleSaveProject} className="space-y-6">
                                    {projectMessage.text && (
                                        <div className={`p-3 rounded-lg text-sm ${
                                            projectMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                            {projectMessage.text}
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Project Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Project Code <span className="text-gray-500 font-normal">(3-5 letters)</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={5}
                                            value={projectCode}
                                            onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                                            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm uppercase"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSavingProject || !projectName.trim() || !projectCode.trim()}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </form>

                                <div className="mt-12 pt-6 border-t border-gray-800">
                                    <h4 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h4>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Deleting this project will hide it and all its workspaces from everyone.
                                    </p>
                                    <button
                                        onClick={handleDeleteProject}
                                        className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Delete Project
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Workspaces Tab */}
                        {activeTab === 'workspaces' && (
                            <div className="max-w-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-white mb-6">Manage Workspaces</h3>
                                
                                <div className="space-y-4">
                                    {workspaces.map(ws => (
                                        <div key={ws._id} className="bg-gray-950 border border-gray-800 rounded-lg p-4">
                                            {editingWsId === ws._id ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                                                        <input 
                                                            type="text" 
                                                            value={editWsName} 
                                                            onChange={e => setEditWsName(e.target.value)} 
                                                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-400 mb-1">Code</label>
                                                            <input 
                                                                type="text" 
                                                                value={editWsCode} 
                                                                onChange={e => setEditWsCode(e.target.value.toUpperCase())} 
                                                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                                                            <input 
                                                                type="text" 
                                                                value={editWsDesc} 
                                                                onChange={e => setEditWsDesc(e.target.value)} 
                                                                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button 
                                                            onClick={cancelEditWorkspace}
                                                            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors flex items-center gap-1"
                                                        >
                                                            <XCircle size={14} /> Cancel
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSaveWorkspace(ws._id)}
                                                            className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center gap-1"
                                                        >
                                                            <Check size={14} /> Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-200">{ws.name} <span className="text-xs text-gray-500 font-normal ml-2">{ws.code}</span></h4>
                                                        <p className="text-xs text-gray-400 mt-1">{ws.description || 'No description'}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => startEditWorkspace(ws)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded transition-colors"
                                                            title="Edit Workspace"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteWorkspace(ws._id, ws.name)}
                                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                                                            title="Delete Workspace"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {workspaces.length === 0 && (
                                        <div className="text-sm text-gray-500 py-4 text-center">
                                            No workspaces found in this project.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageProjectWorkspaceModal;
