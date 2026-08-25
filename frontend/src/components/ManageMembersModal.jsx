import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Loader2, UserMinus, Crown } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';

const ManageMembersModal = ({ isOpen, onClose, channel }) => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('view'); // 'view' or 'add'
    
    const [members, setMembers] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);

    // ConfirmDialog state for Transfer Ownership
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        selectedUserId: null,
        selectedUserName: '',
    });

    // Derive myRole from the fetched members
    const myMembership = members.find(m => m.userId?._id === currentUser?._id);
    const myRole = myMembership?.role || 'member';

    useEffect(() => {
        if (isOpen && channel) {
            fetchMembers();
            setActiveTab('view');
        }
    }, [isOpen, channel]);

    useEffect(() => {
        if (isOpen && activeTab === 'add') {
            fetchAvailableUsers();
        }
    }, [isOpen, activeTab]);

    const fetchMembers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Note: If you don't have this exact endpoint, you might need to adjust.
            // For Phase 4 we will mock or call the standard endpoints.
            const response = await api.get(`/conversation-members/conversation/${channel._id}`);
            if (response.data.success) {
                setMembers(response.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch members:", err);
            setError("Failed to load members.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAvailableUsers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch all users in organization
            const response = await api.get(`/users`);
            if (response.data.success) {
                const allUsers = response.data.data;
                // Filter out users who are already members
                const memberUserIds = members.map(m => m.userId?._id || m.userId);
                const nonMembers = allUsers.filter(u => !memberUserIds.includes(u._id));
                setAvailableUsers(nonMembers);
            }
        } catch (err) {
            console.error("Failed to fetch users:", err);
            setError("Failed to load available users.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMember = async (userId) => {
        setActionLoadingId(userId);
        try {
            const response = await api.post('/conversation-members', {
                conversationId: channel._id,
                userId,
                role: 'member'
            });
            if (response.data.success) {
                // Refresh both lists
                await fetchMembers();
                setActiveTab('view');
            }
        } catch (err) {
            console.error("Failed to add member:", err);
            setError(err.response?.data?.message || "Failed to add member");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleRemoveMember = async (memberId) => {
        setActionLoadingId(memberId);
        try {
            await api.delete(`/conversation-members/${memberId}`);
            setMembers(prev => prev.filter(m => m._id !== memberId));
        } catch (err) {
            console.error("Failed to remove member:", err);
            setError(err.response?.data?.message || "Failed to remove member");
        } finally {
            setActionLoadingId(null);
        }
    };

    const openTransferConfirm = (userId, userName) => {
        setConfirmState({
            isOpen: true,
            selectedUserId: userId,
            selectedUserName: userName,
        });
    };

    const closeConfirm = () => {
        setConfirmState({ isOpen: false, selectedUserId: null, selectedUserName: '' });
    };

    const handleConfirmTransfer = async () => {
        const { selectedUserId } = confirmState;
        if (!selectedUserId) return;

        setActionLoadingId('transfer');
        setError(null);
        try {
            const response = await api.patch(`/conversations/${channel._id}/transfer-ownership`, {
                newOwnerId: selectedUserId
            });
            if (response.data.success) {
                await fetchMembers(); // Refresh to reflect new roles
                closeConfirm();
            }
        } catch (err) {
            console.error("Failed to transfer ownership:", err);
            setError(err.response?.data?.message || "Failed to transfer ownership.");
        } finally {
            setActionLoadingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users size={20} className="text-blue-600" />
                        Manage Members
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('view')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'view' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Current Members ({members.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('add')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'add' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Add New Members
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-gray-400" size={24} />
                        </div>
                    ) : activeTab === 'view' ? (
                        <div className="space-y-3">
                            {members.length === 0 ? (
                                <p className="text-center text-gray-500 py-4">No members found.</p>
                            ) : (
                                members.map(member => (
                                    <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                                                {member.userId?.fullName?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {member.userId?.fullName || 'Unknown User'}
                                                    {member.userId?._id === currentUser?._id && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">You</span>}
                                                </p>
                                                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Transfer Ownership button (only if I am owner and target is not me) */}
                                            {myRole === 'owner' && member.userId?._id !== currentUser._id && (
                                                <button
                                                    onClick={() => openTransferConfirm(member.userId._id, member.userId.fullName)}
                                                    disabled={actionLoadingId === 'transfer'}
                                                    className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-colors"
                                                    title="Transfer Ownership"
                                                >
                                                    <Crown size={16} />
                                                </button>
                                            )}

                                            {/* Don't let users remove themselves or owners remove other owners easily without transfer */}
                                            {member.userId?._id !== currentUser._id && (
                                                <button
                                                    onClick={() => handleRemoveMember(member._id)}
                                                    disabled={actionLoadingId === member._id}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                    title="Remove member"
                                                >
                                                    {actionLoadingId === member._id ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {availableUsers.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-gray-900 font-medium mb-1">Everyone is here!</p>
                                    <p className="text-sm text-gray-500">All users in the organization are already in this channel.</p>
                                </div>
                            ) : (
                                availableUsers.map(u => (
                                    <div key={u._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg gap-2 overflow-hidden">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
                                                {u.fullName?.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{u.fullName}</p>
                                                <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(u._id)}
                                            disabled={actionLoadingId === u._id}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors shrink-0"
                                        >
                                            {actionLoadingId === u._id ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                            Add
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                
            </div>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title="Transfer Ownership"
                message={<span>Are you sure you want to transfer ownership to <strong>{confirmState.selectedUserName}</strong>? You will become an admin and lose owner privileges.</span>}
                confirmLabel="Transfer Ownership"
                variant="warning"
                isLoading={actionLoadingId === 'transfer'}
                onConfirm={handleConfirmTransfer}
                onCancel={closeConfirm}
            />
        </div>
    );
};

export default ManageMembersModal;
