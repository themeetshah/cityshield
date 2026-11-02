import { useEffect, useRef } from 'react';

/**
 * Calls `callback` every `intervalMs` while the tab is visible. Polling pauses when the tab is
 * hidden and resumes (with an immediate call) when it becomes visible again.
 * The initial load is the caller's responsibility.
 */
const usePolling = (callback, intervalMs, enabled = true) => {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        if (!enabled) return undefined;
        let timer = null;

        const start = () => {
            if (timer === null) timer = setInterval(() => callbackRef.current(), intervalMs);
        };
        const stop = () => {
            if (timer !== null) {
                clearInterval(timer);
                timer = null;
            }
        };
        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                callbackRef.current();
                start();
            } else {
                stop();
            }
        };

        if (document.visibilityState === 'visible') start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [intervalMs, enabled]);
};

export default usePolling;
