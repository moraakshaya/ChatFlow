import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Loader2, Trash2, CheckCheck, Check } from 'lucide-react';
import useMessages from '../hooks/useMessages';
import useConversations from '../hooks/useConversations';
import useTyping from '../hooks/useTyping';
import ChannelHeader from './ChannelHeader';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ManageMembersModal from './ManageMembersModal';

const ChatWindow = () => {
    const { id: conversationId } = useParams();
    const { user } = useAuth();
    const { socket } = useSocket();

    const { conversations, markConversationAsRead } = useConversations();
    const activeChannel = conversations?.find(c => c._id === conversationId);

    const { messages, isLoading, sendMessage, deleteMessage, toggleReaction } = useMessages(conversationId);

    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);

    // Set of messageIds that have been read by the other person (for blue ticks in DMs)
    const [readMessageIds, setReadMessageIds] = useState(new Set());

    // Typing indicators
    const { typingUsers, onInputChange, stopTyping } = useTyping(socket, conversationId, user);

    const PRESET_EMOJIS = ["👍", "❤️", "😂", "🎉", "😢"];

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll to bottom + auto mark-as-read whenever messages change
    useEffect(() => {
        scrollToBottom();
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

    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Render WhatsApp-style tick marks (only for own messages in DMs)
    const renderTicks = (msg, isOwnMessage) => {
        if (!isOwnMessage) return null;
        if (activeChannel?.type !== 'private') return null;
        if (msg.isDeleted) return null;

        const isRead = readMessageIds.has(msg._id);

        return (
            <span className={`inline-flex items-center ml-1 ${isRead ? 'text-blue-200' : 'text-blue-300 opacity-70'}`}>
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
                typingText={typingUsers.size > 0 ? buildTypingText(typingUsers) : null}
            />

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

                                        {/* Hover Actions */}
                                        <div className={`absolute top-0 flex items-center bg-white border border-gray-200 shadow-sm rounded-md overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} -translate-y-2`}>
                                            {/* Emoji Picker */}
                                            <div className="flex bg-gray-50 border-r border-gray-200 px-1 py-1">
                                                {PRESET_EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => toggleReaction(msg._id, emoji)}
                                                        className="px-1.5 hover:scale-125 transition-transform"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>

                                            {isOwnMessage && !msg.isDeleted && (
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm("Are you sure you want to delete this message?")) {
                                                            deleteMessage(msg._id);
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-50 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* ── Main Bubble ── */}
                                        <div className={`px-4 pt-2 pb-1.5 rounded-2xl shadow-sm relative ${
                                            isOwnMessage
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                        }`}>
                                            {msg.isDeleted ? (
                                                <div className={`italic text-sm ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                                                    This message was deleted.
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
                                                        <span>{emoji}</span>
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
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-lg p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow shadow-sm"
                >
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

            {/* Manage Members Modal */}
            <ManageMembersModal
                isOpen={isManageMembersOpen}
                onClose={() => setIsManageMembersOpen(false)}
                channel={activeChannel}
            />
        </div>
    );
};

export default ChatWindow;
