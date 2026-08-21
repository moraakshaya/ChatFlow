import React from 'react';
import { Hash, Users, Settings } from 'lucide-react';

const ChannelHeader = ({ channel, onManageMembers, typingText }) => {
    if (!channel) return null;

    const isPrivate = channel.type === 'private';
    const dmName = isPrivate && channel.targetUser ? channel.targetUser.fullName : null;
    const initial = dmName ? dmName.charAt(0).toUpperCase() : '?';

    return (
        <div className="min-h-14 border-b border-gray-200 flex items-center justify-between px-6 py-2 bg-white shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-2">
                {isPrivate ? (
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-semibold text-white mr-1 shrink-0">
                        {initial}
                    </div>
                ) : (
                    <Hash size={20} className="text-gray-400 shrink-0" />
                )}

                {/* Name + typing subtitle (WhatsApp-style) */}
                <div className="flex flex-col leading-tight">
                    <h2 className="text-base font-bold text-gray-900 leading-snug">
                        {isPrivate ? dmName : channel.name}
                    </h2>

                    {/* Animated subtitle: typing takes priority over description */}
                    {typingText ? (
                        <span className="flex items-center gap-1 text-xs text-blue-500 font-medium">
                            <span className="typing-dots text-blue-400">
                                <span /><span /><span />
                            </span>
                            <span className="italic">{typingText}</span>
                        </span>
                    ) : channel.description && !isPrivate ? (
                        <p className="text-xs text-gray-400 truncate max-w-sm">{channel.description}</p>
                    ) : null}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isPrivate && (
                    <div className="flex items-center gap-4">
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                            <Users size={18} />
                        </button>
                        <button
                            onClick={onManageMembers}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="Manage Channel Details"
                        >
                            <Settings size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChannelHeader;
