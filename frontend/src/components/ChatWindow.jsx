import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Loader2, Trash2, CheckCheck, Archive, Paperclip, File, Image as ImageIcon, FileText, Download, Plus, Smile, CornerUpLeft, Copy, Edit2, CornerUpRight, Pin, MessageSquare, ChevronDown } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import useMessages from '../hooks/useMessages';
import useConversations from '../hooks/useConversations';
import useTyping from '../hooks/useTyping';
import ChannelHeader from './ChannelHeader';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ManageMembersModal from './ManageMembersModal';
import ChannelSettingsModal from './ChannelSettingsModal';

const ChatWindow = () => {
    const { id: conversationId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { socket } = useSocket();

    const {
        conversations,
        markConversationAsRead,
        updateConversationLocally,
        archiveConversationLocally,
        unarchiveConversationLocally,
        removeConversationLocally
    } = useConversations();
    const activeChannel = conversations?.find(c => c._id === conversationId);

    const { messages, isLoading, sendMessage, sendAttachment, deleteMessage, toggleReaction, hasMore, isFetchingMore, fetchMoreMessages, memberReadStates } = useMessages(conversationId);

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgressText, setUploadProgressText] = useState('');
    const fileInputRef = useRef(null);

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Set of messageIds that have been read by the other person (for blue ticks in DMs)
    const [readMessageIds, setReadMessageIds] = useState(new Set());

    // Typing indicators
    const { typingUsers, onInputChange, stopTyping } = useTyping(socket, conversationId, user);

    const PRESET_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
    
    // Emoji Picker state
    const [activeEmojiPickerId, setActiveEmojiPickerId] = useState(null);
    const emojiPickerRef = useRef(null);
    const [isInputEmojiPickerOpen, setIsInputEmojiPickerOpen] = useState(false);
    const inputEmojiPickerRef = useRef(null);

    // Dropdown state
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const dropdownRef = useRef(null);

    // Image Viewer state
    const [viewingImage, setViewingImage] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setActiveEmojiPickerId(null);
            }
            if (inputEmojiPickerRef.current && !inputEmojiPickerRef.current.contains(event.target)) {
                setIsInputEmojiPickerOpen(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /** Builds human-friendly typing text from the typingUsers map */
    const buildTypingText = (users) => {
        const names = [...users.values()];
        if (names.length === 1) return `${names[0]} is typing…`;
        if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
        const rest = names.length - 2;
        return `${names[0]}, ${names[1]} and ${rest} other${rest > 1 ? 's' : ''} are typing…`;
    };

    const messagesEndRef = useRef(null);
    const prevMessageCountRef = useRef(0);
    const scrollContainerRef = useRef(null);
    const scrollHeightRef = useRef(0);
    const justFetchedRef = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleScroll = (e) => {
        const container = e.target;
        if (container.scrollTop === 0 && hasMore && !isFetchingMore) {
            scrollHeightRef.current = container.scrollHeight;
            justFetchedRef.current = true;
            fetchMoreMessages();
        }
    };

    // Handle scroll position and auto mark-as-read whenever messages change
    useLayoutEffect(() => {
        if (justFetchedRef.current && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            container.scrollTop = container.scrollHeight - scrollHeightRef.current;
            justFetchedRef.current = false;
        } else {
            scrollToBottom();
        }

        if (conversationId && messages.length > prevMessageCountRef.current) {
            markConversationAsRead(conversationId);
        }
        prevMessageCountRef.current = messages.length;
    }, [messages]);

    // Mark as read on channel open / switch
    useEffect(() => {
        if (conversationId) {
            markConversationAsRead(conversationId);
            // Reset read set when switching conversations
            setReadMessageIds(new Set());
        }
    }, [conversationId]);

    // Listen for message:read events (so we can show blue ticks in DMs)
    useEffect(() => {
        if (!socket || !conversationId) return;

        const handleMessageRead = ({ conversationId: convId, messageId, userId: readerId }) => {
            // Only care about the OTHER person reading our messages in this DM
            if (convId !== conversationId) return;
            if (readerId === user?._id) return; // ignore own read receipts

            setReadMessageIds(prev => {
                const next = new Set(prev);
                next.add(messageId);
                return next;
            });
        };

        socket.on('message:read', handleMessageRead);
        return () => socket.off('message:read', handleMessageRead);
    }, [socket, conversationId, user]);

    // Also emit read:message for the latest message when we open / get new messages (DM only)
    // This tells the OTHER user that we've read their message → turns their ticks blue
    useEffect(() => {
        if (!socket || !conversationId || !messages.length) return;
        if (activeChannel?.type !== 'private') return; // only DMs

        const lastMsg = messages[messages.length - 1];
        if (!lastMsg || lastMsg.senderId?._id === user?._id || lastMsg.senderId === user?._id) return;

        socket.emit('read:message', { conversationId, messageId: lastMsg._id });
    }, [messages, socket, conversationId, activeChannel?.type, user]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        // Immediately stop typing indicator before sending
        stopTyping();

        setIsSending(true);
        const { success } = await sendMessage(newMessage);
        if (success) {
            setNewMessage('');
        }
        setIsSending(false);
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy!', err);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input
        e.target.value = '';

        // Validate size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size exceeds the 10MB limit.');
            return;
        }

        setIsUploading(true);
        setUploadProgressText(`Uploading ${file.name}...`);
        
        const { success, message } = await sendAttachment(file);
        
        if (!success) {
            alert(message || 'Failed to upload attachment');
        }
        
        setIsUploading(false);
        setUploadProgressText('');
    };

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Render WhatsApp-style tick marks (only for own messages in DMs)
    const renderTicks = (msg, isOwnMessage) => {
        if (!isOwnMessage) return null;
        if (activeChannel?.type !== 'private') return null;
        if (msg.isDeleted) return null;

        let isRead = readMessageIds.has(msg._id);
        
        if (!isRead && activeChannel.targetUser && memberReadStates) {
            const otherUserId = activeChannel.targetUser._id || activeChannel.targetUser;
            const otherUserLastReadId = memberReadStates[otherUserId];
            if (otherUserLastReadId && msg._id <= otherUserLastReadId) {
                isRead = true;
            }
        }

        return (
            <span className={`inline-flex items-center ml-1 ${isRead ? 'text-cyan-300 shadow-sm' : 'text-blue-300 opacity-70'}`}>
                <CheckCheck size={13} strokeWidth={2.5} />
            </span>
        );
    };

    if (!activeChannel) {
        return (
            <div className="flex-1 flex flex-col bg-white overflow-hidden items-center justify-center">
                <Loader2 className="animate-spin text-gray-400 mb-4" size={32} />
                <p className="text-gray-500">Loading channel...</p>
            </div>
        );
    }

    const isDM = activeChannel.type === 'private';

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
            <ChannelHeader
                channel={activeChannel}
                onManageMembers={() => setIsManageMembersOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                typingText={typingUsers.size > 0 ? buildTypingText(typingUsers) : null}
            />

            {/* Message Feed */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-6 space-y-6"
            >
                {isFetchingMore && (
                    <div className="flex justify-center py-2">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                    </div>
                )}
                {isLoading ? (
                    <div className="flex justify-center my-10">
                        <Loader2 className="animate-spin text-gray-400" size={32} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                            <span className="text-3xl">👋</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {isDM
                                ? `Say hello to ${activeChannel.targetUser?.fullName || 'your teammate'}!`
                                : `Welcome to #${activeChannel.name}!`}
                        </h3>
                        <p className="text-gray-500">
                            {isDM
                                ? `This is the very beginning of your direct message history with ${activeChannel.targetUser?.fullName || 'them'}.`
                                : `This is the start of the #${activeChannel.name} channel. Send a message to get the conversation started.`}
                        </p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isOwnMessage = msg.senderId?._id === user?._id || msg.senderId === user?._id;
                        const senderName = msg.senderId?.fullName || 'Unknown User';

                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const isSameSender = prevMsg && (prevMsg.senderId?._id === msg.senderId?._id);
                        const timeDiff = prevMsg ? new Date(msg.createdAt) - new Date(prevMsg.createdAt) : Infinity;
                        const isGrouped = isSameSender && timeDiff < 5 * 60 * 1000;

                        return (
                            <div
                                key={msg._id}
                                className={`flex gap-3 group ${isGrouped ? 'mt-1' : 'mt-6'} ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                {/* Avatar (only show if not grouped) */}
                                {!isGrouped ? (
                                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold shrink-0 shadow-sm text-sm ${isOwnMessage ? 'ml-1' : 'mr-1'}`}>
                                        {senderName.charAt(0).toUpperCase()}
                                    </div>
                                ) : (
                                    <div className="w-8 shrink-0" />
                                )}

                                <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                                    {/* Sender name (only show if not grouped, and not own message in DM) */}
                                    {!isGrouped && (
                                        <div className={`flex items-baseline gap-2 mb-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {isOwnMessage ? 'You' : senderName}
                                            </span>
                                        </div>
                                    )}

                                    {/* Message Bubble & Reactions Container */}
                                    <div className={`relative flex items-center gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>



                                        {/* Full Emoji Picker Popup */}
                                        {activeEmojiPickerId === msg._id && (
                                            <div 
                                                ref={emojiPickerRef}
                                                className={`absolute bottom-full mb-2 z-50 shadow-2xl rounded-lg ${isOwnMessage ? 'right-0' : 'left-0'}`}
                                            >
                                                <EmojiPicker 
                                                    onEmojiClick={(emojiData) => {
                                                        toggleReaction(msg._id, emojiData.emoji);
                                                        setActiveEmojiPickerId(null);
                                                    }}
                                                    width={320}
                                                    height={400}
                                                    autoFocusSearch={false}
                                                    theme="dark"
                                                    style={{
                                                        '--epr-bg-color': '#111b21',
                                                        '--epr-category-label-bg-color': '#111b21',
                                                        '--epr-search-input-bg-color': '#202c33',
                                                        '--epr-search-border-color-focus': '#00a884',
                                                        '--epr-active-category-indicator-color': '#00a884',
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* ── Main Bubble ── */}
                                        <div className={`px-4 pt-2 pb-1.5 rounded-2xl shadow-sm relative group/bubble ${
                                            isOwnMessage
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                        }`}>
                                            <button 
                                                onClick={() => setActiveDropdownId(activeDropdownId === msg._id ? null : msg._id)}
                                                className={`absolute top-1 right-1 p-0.5 rounded-full ${activeDropdownId === msg._id ? 'opacity-100' : 'opacity-0 group-hover/bubble:opacity-100'} transition-all z-20 ${isOwnMessage ? 'bg-blue-600 text-blue-100 hover:text-white hover:bg-blue-700' : 'bg-white text-gray-400 hover:text-gray-800 hover:bg-gray-100 shadow-[0_0_8px_4px_rgba(255,255,255,0.9)]'}`}
                                            >
                                                <ChevronDown size={20} />
                                            </button>
                                            
                                            {/* Dropdown Menu (Inside Bubble) */}
                                            {activeDropdownId === msg._id && (
                                                <div 
                                                    ref={dropdownRef}
                                                    className={`absolute top-7 right-2 w-48 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-50 text-gray-800`}
                                                >
                                                    <button onClick={() => alert('Reply coming soon!')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                        <CornerUpLeft size={14} /> Reply
                                                    </button>
                                                    <button onClick={() => { setActiveEmojiPickerId(msg._id); setActiveDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                        <Smile size={14} /> React
                                                    </button>
                                                    <button onClick={() => { copyToClipboard(msg.content || ''); setActiveDropdownId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                        <Copy size={14} /> Copy text
                                                    </button>
                                                    
                                                    {isOwnMessage && (
                                                        <button onClick={() => alert('Edit coming soon!')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                            <Edit2 size={14} /> Edit
                                                        </button>
                                                    )}
                                                    
                                                    <button onClick={() => alert('Forward coming soon!')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                        <CornerUpRight size={14} /> Forward
                                                    </button>
                                                    <button onClick={() => alert('Pin coming soon!')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                        <Pin size={14} /> Pin
                                                    </button>

                                                    {msg.type === 'attachment' && msg.attachments?.length > 0 && (
                                                        <button onClick={() => { 
                                                            if (msg.attachments[0].mimeType?.startsWith('image/')) {
                                                                setViewingImage(msg.attachments[0]);
                                                            } else {
                                                                window.open(msg.attachments[0].url, '_blank');
                                                            }
                                                            setActiveDropdownId(null); 
                                                        }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                            <Download size={14} /> Download
                                                        </button>
                                                    )}

                                                    {!isOwnMessage && (
                                                        <button onClick={() => alert('Message User coming soon!')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                                            <MessageSquare size={14} /> Message User
                                                        </button>
                                                    )}

                                                    {isOwnMessage && !msg.isDeleted && (
                                                        <>
                                                            <div className="border-t border-gray-100 my-1"></div>
                                                            <button 
                                                                onClick={() => {
                                                                    if (window.confirm("Are you sure you want to delete this message?")) {
                                                                        deleteMessage(msg._id);
                                                                    }
                                                                    setActiveDropdownId(null);
                                                                }} 
                                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {msg.isDeleted ? (
                                                <div className={`italic text-sm ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    This message was deleted.
                                                </div>
                                            ) : msg.type === 'attachment' && msg.attachments?.length > 0 ? (
                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    {msg.attachments.map((att, index) => (
                                                        <div 
                                                            key={index} 
                                                            className={`flex items-center gap-3 p-3 mt-1 rounded-xl border transition-colors ${
                                                                isOwnMessage 
                                                                    ? 'bg-blue-600 border-blue-500 hover:bg-blue-700' 
                                                                    : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                                            } ${att.mimeType?.startsWith('image/') ? 'cursor-pointer' : ''}`}
                                                            onClick={() => {
                                                                if (att.mimeType?.startsWith('image/')) {
                                                                    setViewingImage(att);
                                                                }
                                                            }}
                                                        >
                                                            <div className={`p-2 rounded-lg ${isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white text-blue-600 shadow-sm'}`}>
                                                                {att.mimeType?.startsWith('image/') ? <ImageIcon size={24} /> : 
                                                                 att.mimeType?.includes('pdf') ? <FileText size={24} /> : 
                                                                 <File size={24} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isOwnMessage ? 'text-white' : 'text-gray-900'}`} title={att.filename}>
                                                                    {att.filename}
                                                                </p>
                                                                <p className={`text-xs mt-0.5 ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`}>
                                                                    {formatBytes(att.sizeBytes)} • {att.mimeType?.split('/')[1]?.toUpperCase() || 'FILE'}
                                                                </p>
                                                            </div>
                                                            <button 
                                                                className={`p-2 rounded-full transition-colors shrink-0 ${isOwnMessage ? 'hover:bg-blue-500 text-blue-200 hover:text-white' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'}`}
                                                                title="Download"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (att.mimeType?.startsWith('image/')) {
                                                                        setViewingImage(att);
                                                                    } else {
                                                                        window.open(att.url, '_blank');
                                                                    }
                                                                }}
                                                            >
                                                                <Download size={18} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="break-words whitespace-pre-wrap leading-relaxed">
                                                    {msg.content}
                                                </div>
                                            )}

                                            {/* ── Time + Ticks (inside bubble, WhatsApp-style) ── */}
                                            <div className={`flex items-center justify-end gap-0.5 mt-0.5 select-none ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                                                <span className="text-[10px] leading-none">
                                                    {formatTime(msg.createdAt)}
                                                </span>
                                                {renderTicks(msg, isOwnMessage)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reactions Display */}
                                    {msg.reactions && msg.reactions.length > 0 && (
                                        <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                            {Object.entries(
                                                msg.reactions.reduce((acc, r) => {
                                                    acc[r.reaction] = (acc[r.reaction] || 0) + 1;
                                                    return acc;
                                                }, {})
                                            ).map(([emoji, count]) => {
                                                const hasReacted = msg.reactions.some(r => r.userId === user?._id && r.reaction === emoji);
                                                return (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => toggleReaction(msg._id, emoji)}
                                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                                                            hasReacted
                                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        <span style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>{emoji}</span>
                                                        <span>{count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                {/* Typing Bubble inside chat feed */}
                {typingUsers.size > 0 && (
                    <div className="flex gap-3 mt-6 flex-row">
                        <div className="w-8 shrink-0" />
                        <div className="flex flex-col items-start max-w-[70%]">
                            <div className="px-4 py-2.5 rounded-2xl shadow-sm bg-white border border-gray-100 text-gray-500 rounded-tl-none">
                                <span className="flex items-center gap-1 text-xs font-medium">
                                    <span className="typing-dots text-gray-400">
                                        <span /><span /><span />
                                    </span>
                                    <span className="italic ml-1">{buildTypingText(typingUsers)}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area — hidden when channel is archived */}
            {activeChannel.status === 'archived' ? (
                <div className="p-4 bg-amber-50 border-t border-amber-200 flex items-center justify-center gap-2 text-amber-700">
                    <Archive size={16} className="shrink-0" />
                    <span className="text-sm font-medium">
                        This channel is archived. Members cannot send new messages.
                    </span>
                </div>
            ) : (
                <div className="p-4 bg-white border-t border-gray-200 relative">
                    {isUploading && (
                        <div className="absolute bottom-full mb-4 left-4 max-w-sm bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 text-gray-700 shadow-xl z-10">
                            <Loader2 size={18} className="animate-spin text-blue-600 shrink-0" />
                            <span className="text-sm font-medium truncate">{uploadProgressText}</span>
                        </div>
                    )}
                    {isInputEmojiPickerOpen && (
                        <div 
                            ref={inputEmojiPickerRef}
                            className="absolute bottom-full mb-2 left-4 z-50 shadow-2xl rounded-lg"
                        >
                            <EmojiPicker 
                                onEmojiClick={(emojiData) => {
                                    setNewMessage(prev => prev + emojiData.emoji);
                                }}
                                width={350}
                                height={400}
                                theme="dark"
                                style={{
                                    '--epr-bg-color': '#111b21',
                                    '--epr-category-label-bg-color': '#111b21',
                                    '--epr-search-input-bg-color': '#202c33',
                                    '--epr-search-border-color-focus': '#00a884',
                                    '--epr-active-category-indicator-color': '#00a884',
                                }}
                            />
                        </div>
                    )}
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-lg p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow shadow-sm"
                    >
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => setIsInputEmojiPickerOpen(!isInputEmojiPickerOpen)}
                            className="p-2.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors shrink-0 mb-0.5"
                            title="Add emoji"
                        >
                            <Smile size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending || isUploading}
                            className="p-2.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors shrink-0 mb-0.5"
                            title="Attach file"
                        >
                            <Paperclip size={20} />
                        </button>
                        <textarea
                            value={newMessage}
                            onChange={(e) => {
                                setNewMessage(e.target.value);
                                if (e.target.value.trim()) {
                                    onInputChange();
                                } else {
                                    stopTyping();
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder={isDM ? `Message ${activeChannel.targetUser?.fullName || 'them'}` : `Message #${activeChannel.name}`}
                            className="flex-1 max-h-32 bg-transparent border-none focus:outline-none focus:ring-0 resize-none py-2 px-2 text-gray-800 placeholder-gray-400"
                            rows={1}
                            style={{ minHeight: '40px' }}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSending}
                            className="p-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 transition-colors shrink-0 mb-0.5"
                        >
                            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                    <div className="text-center mt-2 text-xs text-gray-400">
                        <strong>Return</strong> to send <span className="mx-1">&bull;</span> <strong>Shift + Return</strong> to add a new line
                    </div>
                </div>
            )}

            {/* Manage Members Modal */}
            <ManageMembersModal
                isOpen={isManageMembersOpen}
                onClose={() => setIsManageMembersOpen(false)}
                channel={activeChannel}
            />

            {/* Channel Settings Modal */}
            <ChannelSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                channel={activeChannel}
                onUpdate={updateConversationLocally}
                onArchive={archiveConversationLocally}
                onUnarchive={unarchiveConversationLocally}
                onRemove={(id) => {
                    removeConversationLocally(id);
                    navigate('/');
                }}
            />
            {/* Image Viewer Modal */}
            {viewingImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8" onClick={() => setViewingImage(null)}>
                    <div 
                        className="relative max-w-full max-h-full flex flex-col items-center justify-center bg-transparent"
                        onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
                    >
                        {/* Top Actions Bar */}
                        <div className="absolute -top-12 right-0 flex items-center gap-4 text-white">
                            <button 
                                onClick={() => window.open(viewingImage.url, '_blank')}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors text-sm font-medium"
                            >
                                <Download size={16} /> Download
                            </button>
                            <button 
                                onClick={() => setViewingImage(null)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        {/* The Image */}
                        <img 
                            src={viewingImage.url} 
                            alt={viewingImage.filename} 
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                        />
                        <p className="mt-4 text-white/70 text-sm font-medium">{viewingImage.filename}</p>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default ChatWindow;
