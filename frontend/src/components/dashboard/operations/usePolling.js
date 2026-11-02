import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs `fetcher` now and every `intervalMs` while the tab is visible.
 * - The latest `fetcher` is always used, but the timer is NOT reset on re-render;
 *   it restarts only when one of `deps` changes (e.g. filters), which also triggers an immediate fetch.
 * - Polling pauses while the document is hidden and refreshes as soon as it becomes visible again.
 * - `data` keeps the previous value while refetching; `loading` is true only until the first result.
 *
 * @returns {{ data: any, error: any, loading: boolean, refreshing: boolean, refresh: () => Promise<void>, setData: Function }}
 */
const usePolling = (fetcher, { intervalMs = 30000, enabled = true, deps = [] } = {}) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [refreshing, setRefreshing] = useState(false);
    const fetcherRef = useRef(fetcher);
    const requestRef = useRef(0);

    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    const refresh = useCallback(async () => {
        const requestId = ++requestRef.current;
        setRefreshing(true);
        try {
            const result = await fetcherRef.current();
            if (requestId === requestRef.current) {
                setData(result);
                setError(null);
            }
        } catch (err) {
            if (requestId === requestRef.current) setError(err);
        } finally {
            if (requestId === requestRef.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    const depsKey = JSON.stringify(deps);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return undefined;
        }
        let timer = null;
        const start = () => {
            if (timer === null) timer = setInterval(refresh, intervalMs);
        };
        const stop = () => {
            clearInterval(timer);
            timer = null;
        };
        const onVisibility = () => {
            if (document.hidden) {
                stop();
            } else {
                refresh();
                start();
            }
        };

        refresh();
        if (!document.hidden) start();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            stop();
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [enabled, intervalMs, refresh, depsKey]);

    return { data, error, loading, refreshing, refresh, setData };
};

export default usePolling;
