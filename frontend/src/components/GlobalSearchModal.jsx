import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, MessageSquare, Hash, Lock, X } from 'lucide-react';
import api from '../api/axios';
import { useWorkspace } from '../context/WorkspaceContext';
import useConversations from '../hooks/useConversations';

const GlobalSearchModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { activeWorkspace } = useWorkspace();
    const { conversations } = useConversations();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    
    const inputRef = useRef(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setResults([]);
            setError('');
            // small delay to ensure modal is rendered
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Scroll selected item into view
    useEffect(() => {
        if (selectedIndex >= 0) {
            const el = document.getElementById(`search-result-${selectedIndex}`);
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    // Handle keyboard shortcut (Esc to close)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Debounced search
    useEffect(() => {
        if (!isOpen) return;

        const performSearch = async () => {
            if (!searchQuery.trim()) {
                setResults([]);
                return;
            }

            if (!activeWorkspace) return;

            setIsLoading(true);
            setError('');

            try {
                const response = await api.get('/messages/search', {
                    params: {
                        q: searchQuery,
                        workspaceId: activeWorkspace._id,
                        limit: 20
                    }
                });

                if (response.data.success) {
                    setResults(response.data.data.messages);
                    setSelectedIndex(-1);
                }
            } catch (err) {
                console.error("Search failed:", err);
                setError(`Failed to fetch search results: ${err.response?.data?.message || err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        const timerId = setTimeout(() => {
            performSearch();
        }, 300);

        return () => clearTimeout(timerId);
    }, [searchQuery, isOpen, activeWorkspace]);

    const handleInputKeyDown = (e) => {
        if (!results || results.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            e.preventDefault();
            handleResultClick(results[selectedIndex].conversationId);
        }
    };

    const handleResultClick = (conversationId) => {
        onClose();
        navigate(`/channel/${conversationId}`);
    };
    
    const getConversationDetails = (convId) => {
        return conversations.find(c => c._id === convId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[10vh] z-[100] p-4" onClick={onClose}>
            <div 
                className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden transform transition-all"
                onClick={e => e.stopPropagation()} 
            >
                {/* Search Input Area */}
                <div className="flex items-center p-4 border-b border-gray-800">
                    <Search size={20} className="text-gray-400 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search for messages in this workspace..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500"
                    />
                    <div className="flex items-center gap-2">
                        {isLoading && <Loader2 size={18} className="animate-spin text-blue-500" />}
                        <button 
                            onClick={onClose}
                            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto bg-gray-950 p-2 min-h-[300px]">
                    {!searchQuery.trim() ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center h-full">
                            <Search size={48} className="text-gray-800 mb-4" />
                            <p className="text-gray-400 text-base font-medium">Search across your workspace</p>
                            <p className="text-gray-500 text-sm mt-1">Start typing to find messages in channels and DMs</p>
                        </div>
                    ) : isLoading && results.length === 0 ? (
                        <div className="py-16 flex justify-center items-center h-full">
                            <Loader2 size={32} className="animate-spin text-gray-700" />
                        </div>
                    ) : error ? (
                        <div className="py-12 px-4 text-center text-red-400 text-sm h-full flex items-center justify-center">{error}</div>
                    ) : results.length === 0 ? (
                        <div className="py-16 text-center h-full flex items-center justify-center flex-col">
                            <p className="text-gray-400 text-base font-medium">No results found</p>
                            <p className="text-gray-500 text-sm mt-1">We couldn't find any messages matching "{searchQuery}"</p>
                        </div>
                    ) : (
                        <div className="space-y-1 pb-2">
                            <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Messages
                            </div>
                            {results.map((msg, index) => {
                                const conv = getConversationDetails(msg.conversationId);
                                const isChannel = conv?.type === 'channel' || conv?.type === 'private_channel';
                                const channelIcon = conv?.type === 'private_channel' ? <Lock size={12} /> : (isChannel ? <Hash size={12} /> : null);
                                const isSelected = index === selectedIndex;
                                
                                return (
                                    <button
                                        id={`search-result-${index}`}
                                        key={msg.messageId}
                                        onClick={() => handleResultClick(msg.conversationId)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-all flex gap-4 group cursor-pointer border ${isSelected ? 'bg-gray-800 border-gray-700' : 'border-transparent hover:bg-gray-800 hover:border-gray-700'}`}
                                    >
                                        <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-800 text-gray-500 group-hover:bg-blue-600/20 group-hover:text-blue-400'}`}>
                                            <MessageSquare size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors truncate ${isSelected ? 'text-blue-400/80' : 'text-gray-400 group-hover:text-blue-400/80'}`}>
                                                    {channelIcon}
                                                    <span className="truncate">{conv?.name || 'Unknown channel'}</span>
                                                </div>
                                                <span className="text-[11px] text-gray-500 shrink-0">
                                                    {new Date(msg.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-200 line-clamp-2 break-words leading-relaxed group-hover:text-white transition-colors">
                                                {msg.content}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-4 py-3 bg-gray-900 border-t border-gray-800 text-[11px] text-gray-500 flex justify-between items-center">
                    <span>Showing top {results.length} results</span>
                    <span className="flex gap-2">
                        <span><kbd className="font-sans bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded shadow-sm text-gray-400">↑</kbd> <kbd className="font-sans bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded shadow-sm text-gray-400">↓</kbd> to navigate</span>
                        <span><kbd className="font-sans bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded shadow-sm text-gray-400">↵</kbd> to select</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearchModal;
