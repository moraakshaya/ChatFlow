import React, { useState, useEffect, useRef } from 'react';
import { X, Settings, Loader2, CheckCircle2, Hash, BookOpen, Tag, Archive, ArchiveRestore } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';

const ChannelSettingsModal = ({
    isOpen,
    onClose,
    channel,
    onUpdate,            // (updatedConv) => void — optimistic edit update
    onArchive,          // (channelId)   => void — optimistic archive
    onUnarchive,        // (channelId)   => void — optimistic unarchive
    onRemove,           // (channelId)   => void — called after delete (triggers navigation)
}) => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [topic, setTopic] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [myRole, setMyRole] = useState('member');
    const toastTimer = useRef(null);

    // ConfirmDialog state
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: '',
        variant: 'danger',
        isLoading: false,
        action: null, // 'archive' | 'unarchive' | 'delete'
    });

    useEffect(() => {
        if (isOpen && channel) {
            setName(channel.name || '');
            setDescription(channel.description || '');
            setTopic(channel.topic || '');
            setActiveTab('general');
            setError(null);
            setToast(null);
            checkMyRole();
        }
        return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
    }, [isOpen, channel]);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    };

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

    const isDirty =
        name !== (channel?.name || '') ||
        description !== (channel?.description || '') ||
        topic !== (channel?.topic || '');

    /* ─── General Update ─── */
    const handleUpdateGeneral = async (e) => {
        e.preventDefault();
        if (!isDirty) return;
        if (!name.trim()) { setError('Channel name is required.'); return; }
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.patch(`/conversations/${channel._id}`, {
                name: name.trim(),
                description: description.trim(),
                topic: topic.trim()
            });
            if (response.data.success) {
                if (onUpdate) onUpdate(response.data.data);
                showToast('success', 'Channel updated successfully!');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update channel details.');
        } finally {
            setIsLoading(false);
        }
    };

    /* ─── Confirm Dialog helpers ─── */
    const openConfirm = (action) => {
        if (action === 'archive') {
            setConfirmState({
                isOpen: true,
                title: 'Archive Channel',
                message: `Are you sure you want to archive #${channel.name}? It will become read-only but members can still view past messages. You can unarchive it later.`,
                confirmLabel: 'Archive',
                variant: 'warning',
                isLoading: false,
                action: 'archive',
            });
        } else if (action === 'unarchive') {
            setConfirmState({
                isOpen: true,
                title: 'Restore Channel',
                message: `Unarchiving #${channel.name} will make it active again and allow members to send messages.`,
                confirmLabel: 'Unarchive',
                variant: 'warning',
                isLoading: false,
                action: 'unarchive',
            });
        } else if (action === 'delete') {
            setConfirmState({
                isOpen: true,
                title: 'Delete Channel',
                message: `This will permanently delete #${channel.name} and ALL its messages for every member. This action cannot be undone.`,
                confirmLabel: 'Delete Forever',
                variant: 'danger',
                isLoading: false,
                action: 'delete',
            });
        }
    };

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const handleConfirmAction = async () => {
        const { action } = confirmState;
        setConfirmState(prev => ({ ...prev, isLoading: true }));
        setError(null);
        try {
            if (action === 'archive') {
                await api.patch(`/conversations/${channel._id}/archive`);
                if (onArchive) onArchive(channel._id);
                if (onRemove) onRemove(channel._id); // navigate away
                closeConfirm();
                onClose();
            } else if (action === 'unarchive') {
                await api.patch(`/conversations/${channel._id}/unarchive`);
                if (onUnarchive) onUnarchive(channel._id);
                closeConfirm();
                showToast('success', `#${channel.name} has been restored!`);
            } else if (action === 'delete') {
                await api.delete(`/conversations/${channel._id}`);
                if (onRemove) onRemove(channel._id);
                closeConfirm();
                onClose();
            }
        } catch (err) {
            const msg = err.response?.data?.message || `Failed to ${action} channel.`;
            setConfirmState(prev => ({ ...prev, isLoading: false }));
            setError(msg);
        }
    };

    if (!isOpen || !channel) return null;

    const isAdminOrOwner = myRole === 'admin' || myRole === 'owner';
    const isArchived = channel.status === 'archived';

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                {/* Modal */}
                <div className="relative w-full max-w-lg mx-4 bg-[#1a1d27] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
                                <Settings size={18} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-white leading-tight">Channel Settings</h2>
                                <p className="text-xs text-gray-400 leading-tight flex items-center gap-1">
                                    <Hash size={11} />
                                    {channel.name}
                                    {isArchived && (
                                        <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-400 font-medium">
                                            Archived
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Tabs — only if admin/owner */}
                    {isAdminOrOwner && (
                        <div className="flex border-b border-white/10 px-6 pt-2 gap-1">
                            {['general', 'danger'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setError(null); }}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                                        activeTab === tab
                                            ? tab === 'danger'
                                                ? 'text-red-400 border-b-2 border-red-500 bg-red-500/10'
                                                : 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/10'
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {tab === 'danger' ? '⚠️ Danger Zone' : 'General'}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Toast */}
                    {toast && (
                        <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                            toast.type === 'success'
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                                : 'bg-red-500/15 border border-red-500/30 text-red-400'
                        }`}>
                            <CheckCircle2 size={16} />
                            {toast.msg}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-red-400 bg-red-500/10 border border-red-500/20">
                            <span className="shrink-0">⚠</span>
                            {error}
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1">
                        {activeTab === 'general' ? (
                            <form onSubmit={handleUpdateGeneral} className="space-y-5">

                                {/* Channel Name */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        <Hash size={12} /> Channel Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={!isAdminOrOwner || isLoading || isArchived}
                                        maxLength={100}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        placeholder="e.g. general"
                                        required
                                    />
                                    <div className="text-right text-xs text-gray-600 mt-1">{name.length}/100</div>
                                </div>

                                {/* Topic */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        <Tag size={12} /> Topic
                                        <span className="normal-case font-normal text-gray-600">(shown in header)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        disabled={!isAdminOrOwner || isLoading || isArchived}
                                        maxLength={250}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        placeholder="e.g. Sprint 12 planning & stand-ups"
                                    />
                                    <div className="text-right text-xs text-gray-600 mt-1">{topic.length}/250</div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                        <BookOpen size={12} /> Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={!isAdminOrOwner || isLoading || isArchived}
                                        maxLength={500}
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/60 disabled:opacity-50 disabled:cursor-not-allowed resize-none h-24 transition-all"
                                        placeholder="What is this channel about?"
                                    />
                                    <div className="text-right text-xs text-gray-600 mt-1">{description.length}/500</div>
                                </div>

                                {isAdminOrOwner && !isArchived ? (
                                    <div className="flex items-center justify-between pt-1">
                                        {isDirty && (
                                            <span className="text-xs text-amber-400 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                                Unsaved changes
                                            </span>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={isLoading || !isDirty}
                                            className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            {isLoading ? <Loader2 size={15} className="animate-spin" /> : null}
                                            Save Changes
                                        </button>
                                    </div>
                                ) : isArchived ? (
                                    <p className="text-xs text-amber-400/70 text-center py-2 flex items-center justify-center gap-1.5">
                                        <Archive size={13} />
                                        This channel is archived. Unarchive it to make edits.
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-2">
                                        Only channel admins and owners can edit these settings.
                                    </p>
                                )}
                            </form>
                        ) : (
                            <div className="space-y-4">

                                {/* Unarchive (only if currently archived) */}
                                {isArchived && (
                                    <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                                        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-1">
                                            <ArchiveRestore size={15} />
                                            Restore Channel
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                            Unarchiving will make this channel active again. Members will be able to send messages.
                                        </p>
                                        <button
                                            onClick={() => openConfirm('unarchive')}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Unarchive Channel
                                        </button>
                                    </div>
                                )}

                                {/* Archive (only if not already archived) */}
                                {!isArchived && (
                                    <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl">
                                        <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2 mb-1">
                                            <Archive size={15} />
                                            Archive Channel
                                        </h3>
                                        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                            Archiving makes the channel <strong className="text-amber-400/80">read-only</strong>. Members can still read past messages but cannot send new ones. You can restore it anytime.
                                        </p>
                                        <button
                                            onClick={() => openConfirm('archive')}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-lg font-medium text-sm transition-colors"
                                        >
                                            Archive Channel
                                        </button>
                                    </div>
                                )}

                                {/* Delete */}
                                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
                                    <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-1">
                                        ⚠ Delete Channel
                                    </h3>
                                    <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                                        This action <strong className="text-red-400">cannot be undone</strong>. All messages and files will be permanently deleted for every member.
                                    </p>
                                    <button
                                        onClick={() => openConfirm('delete')}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors"
                                    >
                                        Delete Channel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Confirmation Dialog (rendered on top) */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel={confirmState.confirmLabel}
                variant={confirmState.variant}
                isLoading={confirmState.isLoading}
                onConfirm={handleConfirmAction}
                onCancel={closeConfirm}
            />
        </>
    );
};

export default ChannelSettingsModal;
