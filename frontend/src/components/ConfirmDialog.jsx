import React, { useEffect } from 'react';
import { AlertTriangle, Archive, X, Loader2 } from 'lucide-react';

/**
 * Reusable premium dark-mode confirmation dialog.
 *
 * Props:
 *   isOpen        {boolean}
 *   title         {string}
 *   message       {string|ReactNode}
 *   confirmLabel  {string}  default "Confirm"
 *   cancelLabel   {string}  default "Cancel"
 *   variant       {'danger'|'warning'}  controls confirm button colour
 *   onConfirm     {function}
 *   onCancel      {function}
 *   isLoading     {boolean}
 */
const ConfirmDialog = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const isDanger = variant === 'danger';
    const iconBg = isDanger ? 'bg-red-500/15' : 'bg-amber-500/15';
    const iconColor = isDanger ? 'text-red-400' : 'text-amber-400';
    const confirmBtnClass = isDanger
        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30'
        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/30';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div
                className="relative w-full max-w-sm mx-4 bg-[#1e2130] border border-white/10 rounded-2xl shadow-2xl p-6 animate-scale-in"
                style={{ animation: 'scaleIn 0.15s ease-out' }}
            >
                {/* Close button */}
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={isLoading}
                >
                    <X size={16} />
                </button>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
                    {isDanger
                        ? <AlertTriangle size={24} className={iconColor} />
                        : <Archive size={24} className={iconColor} />
                    }
                </div>

                {/* Content */}
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">{message}</p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${confirmBtnClass}`}
                    >
                        {isLoading && <Loader2 size={15} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.92); }
                    to   { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default ConfirmDialog;
