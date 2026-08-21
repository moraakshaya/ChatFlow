import React, { useState, useEffect } from 'react';
import { X, Hash, Lock } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

const CreateChannelModal = ({ isOpen, onClose, onChannelCreated }) => {
    const { user } = useAuth();
    const { activeProject, activeWorkspace } = useWorkspace();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Member selection state
    const [availableUsers, setAvailableUsers] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]); // Array of user IDs

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        } else {
            // Reset state on close
            setName('');
            setDescription('');
            setIsPrivate(false);
            setError('');
            setSelectedMembers([]);
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            if (response.data.success) {
                // Don't show the current user in the list since they are added automatically
                setAvailableUsers(response.data.data.filter(u => u._id !== user?._id));
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    };

    const toggleMember = (userId) => {
        setSelectedMembers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await api.post('/conversations', {
                workspaceId: activeWorkspace._id,
                projectId: activeProject._id,
                name,
                description,
                type: isPrivate ? 'private' : 'channel',
                members: [user?._id, ...selectedMembers].filter(Boolean)
            });

            if (response.data.success) {
                // Reset form
                setName('');
                setDescription('');
                setIsPrivate(false);
                
                // Trigger callback to refresh the sidebar
                if (onChannelCreated) {
                    onChannelCreated(response.data.data);
                }
                onClose();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create channel');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Create a channel</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">
                                Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    {isPrivate ? <Lock size={16} /> : <Hash size={16} />}
                                </div>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. engineering"
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={name}
                                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Channels are where your team communicates. They're best when organized around a topic — #leads, for example.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">
                                Description <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Add Members <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            
                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-1 space-y-1">
                                {availableUsers.length === 0 ? (
                                    <div className="p-3 text-sm text-gray-500 text-center">No other users found in organization</div>
                                ) : (
                                    availableUsers.map(u => (
                                        <label key={u._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors">
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                checked={selectedMembers.includes(u._id)}
                                                onChange={() => toggleMember(u._id)}
                                            />
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-semibold">
                                                    {u.fullName?.charAt(0)}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{u.fullName}</span>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="mt-1.5 text-xs text-gray-500">You will be automatically added as the channel owner.</p>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900">Make private</h4>
                                <p className="text-xs text-gray-500 max-w-[250px]">
                                    When a channel is set to private, it can only be viewed or joined by invitation.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isPrivate ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating...' : 'Create Channel'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateChannelModal;
