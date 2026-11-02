import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: role=dialog + aria-modal, initial focus, focus trap,
 * Escape to cancel, focus restored to the previously focused element on close.
 */
const SOSDialog = ({ title, children, onCancel, initialFocusRef, tone = 'danger' }) => {
    const titleId = useId();
    const panelRef = useRef(null);
    const onCancelRef = useRef(onCancel);

    useEffect(() => {
        onCancelRef.current = onCancel;
    }, [onCancel]);

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const panel = panelRef.current;
        (initialFocusRef?.current || panel?.querySelector(FOCUSABLE) || panel)?.focus();

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCancelRef.current?.();
                return;
            }
            if (event.key !== 'Tab' || !panel) return;
            const items = [...panel.querySelectorAll(FOCUSABLE)];
            if (!items.length) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
        };
    }, [initialFocusRef]);

    const border = tone === 'danger' ? 'border-red-500' : 'border-gray-300';

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/70 p-4">
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border-4 ${border} bg-white p-5 shadow-2xl focus:outline-none`}
            >
                <h2 id={titleId} className="mb-3 text-center text-2xl font-bold text-red-700">
                    {title}
                </h2>
                {children}
            </div>
        </div>
    );
};

export default SOSDialog;
