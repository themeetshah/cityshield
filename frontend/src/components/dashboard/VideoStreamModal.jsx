import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, MapPin, Navigation, RefreshCw, User, X } from 'lucide-react';
import sosService, { sosTrackingPath } from '../../services/sos';
import { errorMessage } from '../../services/api';

const POLL_MS = 10000;

const formatClock = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';

const formatSize = (bytes) => (bytes ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : '');

const label = (value) => (value ? value.replace(/_/g, ' ') : '');

const isInteractive = (el) => el && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'VIDEO'].includes(el.tagName);

/**
 * Responder view of an SOS's recorded video segments (signed, short-lived URLs).
 * Props: { sosId: number, onClose: () => void }
 */
const VideoStreamModal = ({ sosId, onClose }) => {
    const titleId = useId();
    const [feeds, setFeeds] = useState([]);
    const [urls, setUrls] = useState({}); // feedId -> signed URL (kept stable while playing)
    const [info, setInfo] = useState(null);
    const [currentId, setCurrentId] = useState(null);
    const [waitingForNext, setWaitingForNext] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [playbackError, setPlaybackError] = useState(null);

    const retriedRef = useRef(new Set());
    const closeRef = useRef(null);
    const viewedRef = useRef(new Set());
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const fetchFeeds = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await sosService.getEmergencyVideoFeeds(sosId);
            const list = data.video_feeds || [];
            setFeeds(list);
            setInfo(data.emergency_info || null);
            // Keep existing URLs so the playing segment is never reloaded; add new ones.
            setUrls((prev) => {
                const next = { ...prev };
                list.forEach((f) => {
                    if (!next[f.id]) next[f.id] = f.video_url;
                });
                return next;
            });
            // First load: start at the most recent segment. Never reset an existing selection.
            setCurrentId((prev) => prev ?? (list.length ? list[list.length - 1].id : null));
            setError(null);
        } catch (err) {
            setError(errorMessage(err, 'Could not load the video feed.'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sosId]);

    useEffect(() => {
        fetchFeeds();
        const timer = setInterval(fetchFeeds, POLL_MS);
        return () => clearInterval(timer);
    }, [fetchFeeds]);

    const index = useMemo(() => feeds.findIndex((f) => f.id === currentId), [feeds, currentId]);
    const current = index >= 0 ? feeds[index] : null;
    const currentUrl = current ? urls[current.id] : null;

    const select = useCallback((id) => {
        setPlaybackError(null);
        setWaitingForNext(false);
        setCurrentId(id);
    }, []);

    const goTo = useCallback((offset) => {
        const target = feeds[index + offset];
        if (target) select(target.id);
    }, [feeds, index, select]);

    // A new segment arrived while we were waiting at the end -> continue playing.
    useEffect(() => {
        if (waitingForNext && index >= 0 && index < feeds.length - 1) {
            setWaitingForNext(false);
            setCurrentId(feeds[index + 1].id);
        }
    }, [waitingForNext, feeds, index]);

    const handleEnded = () => {
        if (index < feeds.length - 1) select(feeds[index + 1].id);
        else setWaitingForNext(true);
    };

    const handlePlay = () => {
        if (!current || viewedRef.current.has(current.id)) return;
        viewedRef.current.add(current.id);
        sosService.markVideoViewed(current.id).catch(() => {});
    };

    const handleVideoError = () => {
        if (!current) return;
        if (retriedRef.current.has(current.id)) {
            setPlaybackError('This segment could not be played. Try the next one.');
            return;
        }
        retriedRef.current.add(current.id);
        // Most likely the signed URL expired: drop it and fetch a fresh one.
        setPlaybackError('This segment could not be played. Fetching a fresh link...');
        setUrls((prev) => {
            const next = { ...prev };
            delete next[current.id];
            return next;
        });
        fetchFeeds();
    };

    // Stable keyboard handling: Escape closes; arrows switch segments when focus isn't on a control.
    const goToRef = useRef(goTo);
    useEffect(() => {
        goToRef.current = goTo;
    }, [goTo]);

    useEffect(() => {
        const previouslyFocused = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current?.();
            } else if (!isInteractive(event.target)) {
                if (event.key === 'ArrowRight') goToRef.current(1);
                if (event.key === 'ArrowLeft') goToRef.current(-1);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center bg-black/90 sm:p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="flex w-full max-w-6xl flex-col overflow-hidden bg-gray-900 text-white shadow-2xl sm:rounded-2xl max-h-screen sm:max-h-[95vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        {info?.is_active && (
                            <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold">
                                <span className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                                ACTIVE
                            </span>
                        )}
                        <h2 id={titleId} className="truncate text-base sm:text-lg font-semibold">
                            SOS #{sosId} video
                        </h2>
                        {feeds.length > 0 && index >= 0 && (
                            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">
                                {index + 1}/{feeds.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={fetchFeeds}
                            disabled={refreshing}
                            className="rounded-lg p-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            aria-label="Refresh video segments"
                        >
                            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        </button>
                        <button
                            ref={closeRef}
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-2 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            aria-label="Close video viewer"
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                </header>

                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                    <div className="relative flex flex-1 flex-col bg-black">
                        <div className="relative flex flex-1 items-center justify-center min-h-[40vh]">
                            {loading && <p className="text-gray-300">Loading video...</p>}
                            {!loading && error && (
                                <div role="alert" className="p-6 text-center">
                                    <AlertTriangle className="mx-auto mb-2 h-10 w-10 text-red-400" aria-hidden="true" />
                                    <p className="mb-3">{error}</p>
                                    <button
                                        type="button"
                                        onClick={fetchFeeds}
                                        className="rounded-lg bg-red-600 px-4 py-2 font-semibold hover:bg-red-700"
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}
                            {!loading && !error && feeds.length === 0 && (
                                <p className="p-6 text-center text-gray-300">
                                    No video has been received for this SOS yet.
                                    {info?.is_active ? ' New segments appear here automatically.' : ''}
                                </p>
                            )}
                            {currentUrl && (
                                <video
                                    key={current.id}
                                    src={currentUrl}
                                    controls
                                    autoPlay
                                    playsInline
                                    onPlay={handlePlay}
                                    onEnded={handleEnded}
                                    onError={handleVideoError}
                                    onLoadedData={() => setPlaybackError(null)}
                                    className="max-h-[60vh] lg:max-h-[75vh] w-full bg-black object-contain"
                                />
                            )}
                        </div>
                        {(playbackError || waitingForNext) && (
                            <p className="bg-black/80 px-4 py-2 text-center text-sm text-gray-200" aria-live="polite">
                                {playbackError || 'Waiting for the next segment...'}
                            </p>
                        )}
                        {feeds.length > 0 && (
                            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2">
                                <button
                                    type="button"
                                    onClick={() => goTo(-1)}
                                    disabled={index <= 0}
                                    className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                                </button>
                                <span className="text-xs text-gray-300">
                                    {current ? `Segment ${current.chunk_sequence} · ${formatClock(current.timestamp)}` : ''}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => goTo(1)}
                                    disabled={index < 0 || index >= feeds.length - 1}
                                    className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-40"
                                >
                                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        )}
                    </div>

                    <aside className="w-full lg:w-80 overflow-y-auto border-t lg:border-t-0 lg:border-l border-white/10 bg-gray-800 p-4 max-h-[35vh] lg:max-h-none">
                        {info && (
                            <dl className="mb-4 space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
                                    <dt className="sr-only">Emergency type</dt>
                                    <dd className="font-semibold capitalize">{label(info.emergency_type)} · {info.department}</dd>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                    <dt className="sr-only">Raised by</dt>
                                    <dd>{info.user_name || 'Anonymous'}</dd>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                    <dt className="sr-only">Started</dt>
                                    <dd>{info.created_at ? new Date(info.created_at).toLocaleString() : ''}</dd>
                                </div>
                                {info.latitude != null && info.longitude != null && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                        <dt className="sr-only">Last known location</dt>
                                        <dd>
                                            <Link
                                                to={sosTrackingPath(sosId, info.latitude, info.longitude)}
                                                onClick={onClose}
                                                title="Track this SOS live on the Safety Map"
                                                className="inline-flex items-center gap-1 text-blue-300 underline hover:text-blue-200"
                                            >
                                                {info.latitude.toFixed(5)}, {info.longitude.toFixed(5)}
                                                <Navigation className="h-3 w-3" aria-hidden="true" />
                                            </Link>
                                        </dd>
                                    </div>
                                )}
                                {info.description && (
                                    <div>
                                        <dt className="sr-only">Description</dt>
                                        <dd className="rounded-lg bg-white/10 p-2">{info.description}</dd>
                                    </div>
                                )}
                            </dl>
                        )}
                        <h3 className="mb-2 text-sm font-semibold text-gray-300">Segments ({feeds.length})</h3>
                        {feeds.length === 0 ? (
                            <p className="text-sm text-gray-400">None yet.</p>
                        ) : (
                            <ol className="space-y-1">
                                {feeds.map((feed) => (
                                    <li key={feed.id}>
                                        <button
                                            type="button"
                                            onClick={() => select(feed.id)}
                                            aria-current={feed.id === currentId ? 'true' : undefined}
                                            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${feed.id === currentId ? 'bg-red-600 font-semibold' : 'bg-white/5 hover:bg-white/15'}`}
                                        >
                                            <span className="flex justify-between gap-2">
                                                <span>Segment {feed.chunk_sequence}</span>
                                                <span className="text-xs opacity-80">{formatClock(feed.timestamp)}</span>
                                            </span>
                                            <span className="text-xs opacity-70">
                                                {[feed.duration ? `${Math.round(feed.duration)} s` : '', formatSize(feed.file_size), feed.viewed || viewedRef.current.has(feed.id) ? 'viewed' : '']
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default VideoStreamModal;
