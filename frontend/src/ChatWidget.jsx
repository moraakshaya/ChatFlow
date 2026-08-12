import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { createApiClient } from './api';
import { createSocketClient } from './socket';

export const ChatWidget = ({ token, projectId, title = "Chat Support", primaryColor = "#3b82f6" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [socket, setSocket] = useState(null);
  const [apiClient, setApiClient] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const processedMessageIds = useRef(new Set()); // Deduplication

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    
    if (token) {
      setApiClient(createApiClient(token));
      const newSocket = createSocketClient(token);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        setError(null);
      });

      newSocket.on('connect_error', (err) => {
        setError("Connection error. Retrying...");
      });

      newSocket.on('message:new', (msg) => {
        if (!processedMessageIds.current.has(msg._id)) {
          processedMessageIds.current.add(msg._id);
          setMessages(prev => [msg, ...prev]);
        }
      });

      newSocket.on('typing:start', ({ conversationId, userId }) => {
        if (selectedConvId === conversationId) {
          setIsTyping(true);
        }
      });

      newSocket.on('typing:stop', ({ conversationId, userId }) => {
        if (selectedConvId === conversationId) {
          setIsTyping(false);
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token, primaryColor]);

  // Handle auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    if (!apiClient) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getConversations();
      setConversations(data.data || []);
    } catch (err) {
      setError("Failed to load conversations.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    if (!apiClient) return;
    setIsLoading(true);
    setError(null);
    setMessages([]);
    processedMessageIds.current.clear();
    try {
      const data = await apiClient.getMessages(convId);
      setMessages(data.data || []);
      data.data.forEach(m => processedMessageIds.current.add(m._id));
    } catch (err) {
      setError("Failed to load messages.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!selectedConvId && conversations.length === 0) {
      loadConversations();
    }
  };

  const handleSelectConv = (convId) => {
    setSelectedConvId(convId);
    loadMessages(convId);
    if (socket) {
      socket.emit('room:join', convId);
    }
  };

  const handleBack = () => {
    if (socket && selectedConvId) {
      socket.emit('room:leave', selectedConvId);
    }
    setSelectedConvId(null);
    loadConversations();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim() || !apiClient || !selectedConvId) return;

    const currentMsg = inputMsg;
    setInputMsg('');

    try {
      // Decode user ID from token to pass as senderId. 
      // In a real app, the backend might extract it directly from req.user, but our public API expects it.
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const result = await apiClient.sendMessage(selectedConvId, currentMsg, payload.id);
      
      if (!processedMessageIds.current.has(result.data._id)) {
        processedMessageIds.current.add(result.data._id);
        setMessages(prev => [result.data, ...prev]);
      }
    } catch (err) {
      setError("Failed to send message.");
    }
  };

  const handleTyping = (e) => {
    setInputMsg(e.target.value);
    
    if (socket && selectedConvId) {
      socket.emit('typing:start', selectedConvId);
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', selectedConvId);
      }, 2000);
    }
  };

  if (!token) return null;

  return (
    <div className="chat-widget-wrapper">
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>{title}</h3>
            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="chat-body">
            {isLoading && !selectedConvId && (
              <div className="loading-state">
                <Loader2 className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
                <p>Loading...</p>
              </div>
            )}
            
            {error && !selectedConvId && (
              <div className="error-state">
                <RefreshCw size={24} style={{ marginBottom: '8px' }} />
                <p>{error}</p>
                <button onClick={loadConversations} style={{ marginTop: '10px', padding: '6px 12px', cursor: 'pointer' }}>Retry</button>
              </div>
            )}

            {!isLoading && !error && !selectedConvId && (
              <ul className="conversation-list">
                {conversations.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    No conversations found.
                  </div>
                ) : (
                  conversations.map(conv => (
                    <li key={conv._id} className="conversation-item" onClick={() => handleSelectConv(conv._id)}>
                      <div className="conversation-avatar">
                        {conv.name ? conv.name.charAt(0).toUpperCase() : '#'}
                      </div>
                      <div className="conversation-info">
                        <div className="conversation-name">{conv.name || "Support Channel"}</div>
                        <div className="conversation-preview">
                           {conv.lastMessageId?.content || "Click to view messages"}
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            )}

            {selectedConvId && (
              <div className="message-area">
                <div className="message-header">
                  <button className="back-btn" onClick={handleBack}>
                    <ArrowLeft size={18} />
                  </button>
                  <span style={{ fontWeight: 500 }}>Conversation</span>
                </div>
                
                <div className="message-list">
                  {messages.slice().reverse().map(msg => (
                    // Very simple own check: if sender matches token id
                    <div key={msg._id} className={`message-bubble ${msg.senderId === JSON.parse(atob(token.split('.')[1])).id ? 'own' : 'other'}`}>
                      {msg.content}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="typing-indicator">Someone is typing...</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form className="message-input-area" onSubmit={handleSend}>
                  <input
                    type="text"
                    className="message-input"
                    placeholder="Type a message..."
                    value={inputMsg}
                    onChange={handleTyping}
                  />
                  <button type="submit" className="send-btn" disabled={!inputMsg.trim()}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {!isOpen && (
        <button className="chat-button" onClick={handleOpen}>
          <MessageCircle />
        </button>
      )}
    </div>
  );
};
