import React, { useState, useEffect } from 'react';
import { X, Settings, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const ChannelSettingsModal = ({ isOpen, onClose, channel }) => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('general'); // 'general' or 'danger'
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [myRole, setMyRole] = useState('member'); // default

    useEffect(() => {
        if (isOpen && channel) {
            setName(channel.name || '');
            setDescription(channel.description || '');
            setActiveTab('general');
            setError(null);
            setSuccessMessage(null);
            checkMyRole();
        }
    }, [isOpen, channel]);

    const checkMyRole = async () => {
        if (!channel || !currentUser) return;
        try {
            const response = await api.get(`/conversation-members/check/${channel._id}/${currentUser._id}`);
            if (response.data.success && response.data.data.isMember) {
                setMyRole(response.data.data.role);
            }
        } catch (err) {
            console.error("Failed to check role:", err);
        }
    };

    const handleUpdateGeneral = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await api.patch(`/conversations/${channel._id}`, {
                name,
                description
            });
            if (response.data.success) {
                setSuccessMessage("Channel updated successfully.");
                // Update local state if necessary or let realtime catch it
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error("Failed to update channel:", err);
            setError(err.response?.data?.message || "Failed to update channel details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleArchive = async () => {
        if (!window.confirm("Are you sure you want to archive this channel? It will be read-only.")) return;
        setIsLoading(true);
        setError(null);
        try {
            await api.patch(`/conversations/${channel._id}/archive`);
            onClose();
        } catch (err) {
            console.error("Failed to archive channel:", err);
            setError(err.response?.data?.message || "Failed to archive channel.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("WARNING: This will permanently delete the channel and ALL messages inside it. Are you absolutely sure?")) return;
        setIsLoading(true);
        setError(null);
        try {
            await api.delete(`/conversations/${channel._id}`);
            onClose();
            // The frontend should handle redirecting to another channel or home
        } catch (err) {
            console.error("Failed to delete channel:", err);
            setError(err.response?.data?.message || "Failed to delete channel.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !channel) return null;

    const isAdminOrOwner = myRole === 'admin' || myRole === 'owner';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Settings size={20} className="text-gray-600" />
                        Channel Settings
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                {isAdminOrOwner && (
                    <div className="flex border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('general')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            General
                        </button>
                        <button 
                            onClick={() => setActiveTab('danger')}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'danger' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            Danger Zone
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
                            {successMessage}
                        </div>
                    )}

                    {activeTab === 'general' ? (
                        <form onSubmit={handleUpdateGeneral} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Channel Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={!isAdminOrOwner || isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    placeholder="e.g. general"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description / Topic
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={!isAdminOrOwner || isLoading}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 resize-none h-24"
                                    placeholder="What is this channel about?"
                                />
                            </div>

                            {isAdminOrOwner && (
                                <div className="pt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isLoading || (name === channel.name && description === channel.description)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors font-medium"
                                    >
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                                        Save Changes
                                    </button>
                                </div>
                            )}
                            
                            {!isAdminOrOwner && (
                                <p className="text-sm text-gray-500 text-center mt-4">
                                    Only channel admins and owners can edit these settings.
                                </p>
                            )}
                        </form>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                                <h3 className="text-sm font-semibold text-orange-800 flex items-center gap-2 mb-1">
                                    <AlertTriangle size={16} />
                                    Archive Channel
                                </h3>
                                <p className="text-sm text-orange-700 mb-3">
                                    Archiving a channel makes it read-only. Members will not be able to send new messages, but past messages will remain accessible.
                                </p>
                                <button
                                    onClick={handleArchive}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-md hover:bg-orange-100 font-medium text-sm transition-colors"
                                >
                                    {isLoading ? 'Processing...' : 'Archive Channel'}
                                </button>
                            </div>

                            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                                <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-1">
                                    <AlertTriangle size={16} />
                                    Delete Channel
                                </h3>
                                <p className="text-sm text-red-700 mb-3">
                                    This action cannot be undone. This will permanently delete the channel and all of its messages for everyone.
                                </p>
                                <button
                                    onClick={handleDelete}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium text-sm transition-colors"
                                >
                                    {isLoading ? 'Processing...' : 'Delete Channel'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
            </div>
        </div>
    );
};

export default ChannelSettingsModal;
