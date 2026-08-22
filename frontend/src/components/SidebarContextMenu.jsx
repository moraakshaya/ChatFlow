import React, { useEffect, useRef } from 'react';
import { Pin, PinOff, BellOff, Bell } from 'lucide-react';

/**
 * SidebarContextMenu — a floating right-click context menu for sidebar items.
 *
 * Props:
 *   visible        {boolean}
 *   x              {number}  cursor X position (pageX)
 *   y              {number}  cursor Y position (pageY)
 *   conversationId {string}
 *   isMuted        {boolean}
 *   isPinned       {boolean}
 *   onPin          {function}
 *   onMute         {function}
 *   onClose        {function}
 */
const SidebarContextMenu = ({
    visible,
    x,
    y,
    conversationId,
    isMuted,
    isPinned,
    onPin,
    onMute,
    onClose,
}) => {
    const menuRef = useRef(null);

    // Close on outside click, scroll, or Escape
    useEffect(() => {
        if (!visible) return;

        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        const handleScroll = () => onClose();

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        document.addEventListener('scroll', handleScroll, true);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
            document.removeEventListener('scroll', handleScroll, true);
        };
    }, [visible, onClose]);

    // Adjust position so menu doesn't overflow viewport
    const getAdjustedPosition = () => {
        const menuWidth = 200;
        const menuHeight = 96; // approx 2 items × 48px
        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        let left = x;
        let top = y;

        if (left + menuWidth > viewW) left = viewW - menuWidth - 8;
        if (top + menuHeight > viewH) top = viewH - menuHeight - 8;

        return { left, top };
    };

    if (!visible) return null;

    const { left, top } = getAdjustedPosition();

    const handlePin = () => {
        onPin(conversationId);
        onClose();
    };

    const handleMute = () => {
        onMute(conversationId);
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="fixed z-[100] min-w-[180px] rounded-xl overflow-hidden shadow-2xl border border-white/10"
            style={{
                left,
                top,
                background: 'rgba(24, 27, 40, 0.97)',
                backdropFilter: 'blur(12px)',
                animation: 'contextFadeIn 0.1s ease-out',
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Pin / Unpin */}
            <button
                onClick={handlePin}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors group"
            >
                {isPinned ? (
                    <>
                        <PinOff size={15} className="text-indigo-400 group-hover:text-indigo-300 shrink-0" />
                        <span>Unpin Conversation</span>
                    </>
                ) : (
                    <>
                        <Pin size={15} className="text-indigo-400 group-hover:text-indigo-300 shrink-0" />
                        <span>Pin Conversation</span>
                    </>
                )}
            </button>

            {/* Divider */}
            <div className="mx-3 border-t border-white/10" />

            {/* Mute / Unmute */}
            <button
                onClick={handleMute}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors group"
            >
                {isMuted ? (
                    <>
                        <Bell size={15} className="text-emerald-400 group-hover:text-emerald-300 shrink-0" />
                        <span>Unmute Notifications</span>
                    </>
                ) : (
                    <>
                        <BellOff size={15} className="text-gray-400 group-hover:text-gray-300 shrink-0" />
                        <span>Mute Notifications</span>
                    </>
                )}
            </button>

            <style>{`
                @keyframes contextFadeIn {
                    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default SidebarContextMenu;
