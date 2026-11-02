import { useEffect, useId, useRef } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

export const Panel = ({ icon: Icon, title, tone = 'blue', badge, actions, children }) => {
    const tones = {
        red: 'from-red-50 to-orange-50 text-red-900',
        blue: 'from-blue-50 to-indigo-50 text-blue-900',
        green: 'from-green-50 to-emerald-50 text-green-900',
        purple: 'from-purple-50 to-fuchsia-50 text-purple-900',
        amber: 'from-amber-50 to-yellow-50 text-amber-900',
        slate: 'from-slate-50 to-slate-100 text-slate-900',
    };
    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <header className={`px-3 py-2 sm:px-5 sm:py-3 border-b border-slate-200 bg-gradient-to-r ${tones[tone]}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                        {Icon && <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
                        <span>{title}</span>
                        {badge !== undefined && badge !== null && (
                            <span className="bg-white/80 border border-current/20 text-xs px-2 py-0.5 rounded-full font-bold">
                                {badge}
                            </span>
                        )}
                    </h2>
                    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
                </div>
            </header>
            {children}
        </section>
    );
};

export const LoadingBlock = ({ message = 'Loading…' }) => (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500" role="status">
        <Loader2 className="w-6 h-6 animate-spin mb-2" aria-hidden="true" />
        <p className="text-sm">{message}</p>
    </div>
);

export const EmptyState = ({ icon: Icon, title, subtitle }) => (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
        {Icon && (
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-slate-500" aria-hidden="true" />
            </div>
        )}
        <p className="font-semibold text-slate-800">{title}</p>
        {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-sm">{subtitle}</p>}
    </div>
);

export const ErrorBanner = ({ message, onRetry }) => (
    <div className="m-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1">{message}</span>
        {onRetry && (
            <button type="button" onClick={onRetry} className="font-semibold underline hover:no-underline">
                Retry
            </button>
        )}
    </div>
);

export const LoadMore = ({ shown, total, onClick, busy }) => {
    if (total === undefined || shown >= total) return null;
    return (
        <div className="flex justify-center p-3 border-t border-slate-100">
            <button
                type="button"
                onClick={onClick}
                disabled={busy}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-60"
            >
                {busy ? 'Loading…' : `Load more (${shown} of ${total})`}
            </button>
        </div>
    );
};

export const StatTile = ({ icon: Icon, label, value, hint, tone = 'blue' }) => {
    const tones = {
        red: 'text-red-700 bg-red-50 border-red-200',
        blue: 'text-blue-700 bg-blue-50 border-blue-200',
        green: 'text-green-700 bg-green-50 border-green-200',
        purple: 'text-purple-700 bg-purple-50 border-purple-200',
        amber: 'text-amber-700 bg-amber-50 border-amber-200',
    };
    return (
        <div className={`border rounded-xl p-3 flex items-center gap-3 ${tones[tone]}`}>
            <div className={`p-2 rounded-lg ${tones[tone]} flex-shrink-0`}>
                <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
                <div className="text-xl font-bold text-slate-900 leading-tight">{value}</div>
                <div className="text-xs text-slate-600">{label}</div>
                {hint && <div className="text-[11px] text-slate-500">{hint}</div>}
            </div>
        </div>
    );
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Accessible modal: role="dialog", Escape and backdrop close, focus moved inside and restored. */
export const Modal = ({ title, onClose, children, size = 'max-w-lg' }) => {
    const titleId = useId();
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() => {
        const previous = document.activeElement;
        dialogRef.current?.querySelector(FOCUSABLE)?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') onCloseRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            previous?.focus?.();
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`bg-white rounded-2xl shadow-xl w-full ${size} max-h-[90vh] overflow-y-auto`}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <h2 id={titleId} className="text-lg font-bold text-slate-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="p-2 rounded-lg hover:bg-slate-100"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
};

export const Field = ({ label, htmlFor, children, hint }) => (
    <div className="space-y-1">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">{label}</label>
        {children}
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
);
