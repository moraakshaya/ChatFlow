import React, { useState, useEffect } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';

const NewDMModal = ({ isOpen, onClose, onDMCreated }) => {
    const { user } = useAuth();
    const { activeProject, activeWorkspace } = useWorkspace();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [availableUsers, setAvailableUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
            setSearchQuery('');
        } else {
            setError('');
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await api.get('/users');
            if (response.data.success) {
                // Exclude current user from the list
                setAvailableUsers(response.data.data.filter(u => u._id !== user?._id));
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
            setError('Failed to load users');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleSelectUser = async (targetUserId) => {
        if (!activeWorkspace || !activeProject) {
            setError("Workspace or Project context is missing");
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await api.post('/conversations/direct', {
                targetUserId,
                workspaceId: activeWorkspace._id,
                projectId: activeProject._id
            });

            if (response.data.success) {
                onClose();
                if (onDMCreated) {
                    onDMCreated(response.data.data);
                }
            }
        } catch (err) {
            console.error("Failed to create DM:", err);
            setError(err.response?.data?.message || 'Failed to start direct message');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredUsers = availableUsers.filter(u => 
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Direct Messages</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Find or start a conversation"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="px-4 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">
                        {error}
                    </div>
                )}

                {/* User List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {isLoadingUsers ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="animate-spin text-gray-400" size={24} />
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                            {searchQuery ? 'No users found matching your search.' : 'No other users in this workspace.'}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredUsers.map(u => (
                                <button
                                    key={u._id}
                                    onClick={() => handleSelectUser(u._id)}
                                    disabled={isSubmitting}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 rounded-lg transition-colors text-left disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shrink-0">
                                        {u.fullName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate">{u.fullName}</h4>
                                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                    </div>
                                    {isSubmitting && <Loader2 size={16} className="animate-spin text-blue-600" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewDMModal;
