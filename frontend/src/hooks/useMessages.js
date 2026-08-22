import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const useMessages = (conversationId) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const { socket } = useSocket();
    const { user } = useAuth();
    
    // Use a ref to keep track of current conversationId to avoid stale closures in socket callbacks
    const currentConversationRef = useRef(conversationId);

    useEffect(() => {
        currentConversationRef.current = conversationId;
    }, [conversationId]);

    const fetchMessages = useCallback(async () => {
        if (!conversationId) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get(`/messages/conversation/${conversationId}`);
            if (response.data.success) {
                // Assuming the API returns latest messages first (descending), we reverse them
                // so they appear chronologically top-to-bottom in the chat window.
                setMessages(response.data.data.reverse());
                setNextCursor(response.data.pagination?.nextCursor || null);
                setHasMore(response.data.pagination?.hasMore || false);
            }
        } catch (err) {
            console.error("Failed to fetch messages:", err);
            setError(err.response?.data?.message || 'Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    }, [conversationId]);

    const fetchMoreMessages = useCallback(async () => {
        if (!conversationId || !hasMore || isFetchingMore || !nextCursor) return;
        
        setIsFetchingMore(true);
        try {
            const response = await api.get(`/messages/conversation/${conversationId}?cursor=${encodeURIComponent(nextCursor)}`);
            if (response.data.success) {
                const newMessages = response.data.data.reverse();
                setMessages(prev => [...newMessages, ...prev]);
                setNextCursor(response.data.pagination?.nextCursor || null);
                setHasMore(response.data.pagination?.hasMore || false);
            }
        } catch (err) {
            console.error("Failed to fetch more messages:", err);
        } finally {
            setIsFetchingMore(false);
        }
    }, [conversationId, hasMore, isFetchingMore, nextCursor]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    // Socket Integration
    useEffect(() => {
        if (!socket || !conversationId) return;

        // 1. Join the conversation room (and re-join if socket reconnects)
        const joinRoom = () => {
            socket.emit('join_conversation', { conversationId });
        };
        
        if (socket.connected) {
            joinRoom();
        }
        socket.on('connect', joinRoom);

        // 2. Listen for new messages
        const handleNewMessage = (payload) => {
            const newMessage = payload.message || payload; // handle both { message: {...} } and direct message object

            // Ensure this message belongs to the active conversation
            if (String(newMessage.conversationId) === String(currentConversationRef.current)) {
                setMessages((prev) => {
                    // Prevent duplicate insertion if we already optimistically added it
                    const exists = prev.some(msg => 
                        msg._id === newMessage._id || 
                        (msg.clientMessageId && msg.clientMessageId === newMessage.clientMessageId)
                    );
                    if (exists) return prev;
                    
                    return [...prev, newMessage];
                });
            }
        };

        socket.on('new_message', handleNewMessage);



        const handleMessageDeleted = (payload) => {
            const { messageId, conversationId: msgConvId } = payload;
            if (String(msgConvId) === String(currentConversationRef.current)) {
                setMessages((prev) => prev.map(msg => 
                    msg._id === messageId 
                        ? { ...msg, isDeleted: true, content: undefined, attachments: undefined, reactions: [] } 
                        : msg
                ));
            }
        };
        socket.on('message_deleted', handleMessageDeleted);

        const handleReactionAdded = (payload) => {
            const { messageId, conversationId: msgConvId, userId, reaction, createdAt } = payload;
            if (String(msgConvId) === String(currentConversationRef.current)) {
                setMessages((prev) => prev.map(msg => {
                    if (msg._id === messageId) {
                        const reactions = msg.reactions || [];
                        // Check if reaction already exists locally to prevent duplicates
                        if (reactions.some(r => r.userId === userId && r.reaction === reaction)) {
                            return msg;
                        }
                        return {
                            ...msg,
                            reactions: [...reactions, { messageId, userId, reaction, createdAt }]
                        };
                    }
                    return msg;
                }));
            }
        };
        socket.on('reaction:added', handleReactionAdded);

        const handleReactionRemoved = (payload) => {
            const { messageId, conversationId: msgConvId, userId, reaction } = payload;
            if (String(msgConvId) === String(currentConversationRef.current)) {
                setMessages((prev) => prev.map(msg => {
                    if (msg._id === messageId) {
                        const reactions = msg.reactions || [];
                        return {
                            ...msg,
                            reactions: reactions.filter(r => !(r.userId === userId && r.reaction === reaction))
                        };
                    }
                    return msg;
                }));
            }
        };
        socket.on('reaction:removed', handleReactionRemoved);

        // 3. Cleanup: leave room and remove listener
        return () => {
            socket.emit('leave_conversation', { conversationId });
            socket.off('connect', joinRoom);
            socket.off('new_message', handleNewMessage);
            socket.off('message_deleted', handleMessageDeleted);
            socket.off('reaction:added', handleReactionAdded);
            socket.off('reaction:removed', handleReactionRemoved);
        };
    }, [socket, conversationId]);

    const sendMessage = async (content) => {
        if (!content.trim() || !conversationId) return { success: false };

        try {
            const response = await api.post('/messages', {
                conversationId,
                content,
                type: 'text',
                clientMessageId: crypto.randomUUID()
            });

            if (response.data.success) {
                const newMsg = response.data.data;
                setMessages(prev => {
                    const exists = prev.some(msg => 
                        msg._id === newMsg._id || 
                        (msg.clientMessageId && msg.clientMessageId === newMsg.clientMessageId)
                    );
                    if (exists) return prev;
                    return [...prev, newMsg];
                });
                return { success: true, message: newMsg };
            }
        } catch (err) {
            console.error("Failed to send message:", err);
            let errMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to send message';
            if (err.response?.data?.error?.details && Array.isArray(err.response.data.error.details)) {
                errMsg += ': ' + err.response.data.error.details.map(d => d.message).join(', ');
            }
            return { 
                success: false, 
                message: errMsg 
            };
        }
    };

    const sendAttachment = async (file) => {
        if (!file || !conversationId) return { success: false, message: 'No file provided' };
        
        try {
            // 1. Init upload
            const initResponse = await api.post('/attachments/upload/init', {
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                fileSize: file.size,
                conversationId
            });
            
            if (!initResponse.data.success) {
                return { success: false, message: 'Failed to initialize upload' };
            }
            
            const { attachmentId } = initResponse.data.data;
            
            // 2. Upload file (Mock step - we simulate network delay)
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // 3. Complete upload
            const completeResponse = await api.post(`/attachments/${attachmentId}/complete`);
            
            if (!completeResponse.data.success) {
                return { success: false, message: 'Failed to complete upload' };
            }
            
            // 4. Send Message with Attachment
            const response = await api.post('/messages', {
                conversationId,
                type: 'attachment',
                clientMessageId: crypto.randomUUID(),
                attachments: [{
                    url: attachmentId, // We use attachmentId here for the mock URL reference
                    filename: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    sizeBytes: file.size
                }]
            });
            
            if (response.data.success) {
                const newMsg = response.data.data;
                setMessages(prev => {
                    const exists = prev.some(msg => 
                        msg._id === newMsg._id || 
                        (msg.clientMessageId && msg.clientMessageId === newMsg.clientMessageId)
                    );
                    if (exists) return prev;
                    return [...prev, newMsg];
                });
                return { success: true, message: newMsg };
            }
            
        } catch (err) {
            console.error("Failed to send attachment:", err);
            let errMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Failed to send attachment';
            if (err.response?.data?.error?.details && Array.isArray(err.response.data.error.details)) {
                errMsg += ': ' + err.response.data.error.details.map(d => d.message).join(', ');
            }
            return { 
                success: false, 
                message: errMsg 
            };
        }
    };

    const deleteMessage = async (messageId) => {
        try {
            const response = await api.delete(`/messages/${messageId}`);
            if (response.data.success) {
                setMessages(prev => prev.map(msg => 
                    msg._id === messageId ? { ...msg, isDeleted: true, content: undefined, attachments: undefined, reactions: [] } : msg
                ));
                return { success: true };
            }
        } catch (err) {
            console.error("Failed to delete message:", err);
            return { success: false, message: err.response?.data?.message || 'Failed to delete message' };
        }
    };

    const toggleReaction = (messageId, reaction) => {
        if (!socket || !conversationId || !user) return;
        
        // Find if user already reacted with this emoji
        const msg = messages.find(m => m._id === messageId);
        if (!msg) return;
        
        const reactions = msg.reactions || [];
        const isAdding = !reactions.some(r => r.userId === user._id && r.reaction === reaction);

        const eventName = isAdding ? 'reaction:add' : 'reaction:remove';
        
        socket.emit(eventName, {
            conversationId,
            messageId,
            reaction
        });
        
        // Optimistic update
        setMessages((prev) => prev.map(m => {
            if (m._id === messageId) {
                let currentReactions = m.reactions || [];
                if (isAdding) {
                    return {
                        ...m,
                        reactions: [...currentReactions, { 
                            messageId, 
                            userId: user._id, 
                            reaction, 
                            createdAt: new Date().toISOString() 
                        }]
                    };
                } else {
                    return {
                        ...m,
                        reactions: currentReactions.filter(r => !(r.userId === user._id && r.reaction === reaction))
                    };
                }
            }
            return m;
        }));
    };

    return {
        messages,
        isLoading,
        error,
        hasMore,
        isFetchingMore,
        fetchMoreMessages,
        sendMessage,
        sendAttachment,
        deleteMessage,
        toggleReaction,
        refreshMessages: fetchMessages
    };
};

export default useMessages;
