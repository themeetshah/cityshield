import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Fullscreen, RefreshCw,
    List, AlertTriangle, User, Clock, MapPin, ExternalLink, Info
} from 'lucide-react';
import sosService from '../../services/sos';

const VideoStreamModal = ({ streamData, onClose }) => {
    const [videoFeeds, setVideoFeeds] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [error, setError] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [loadingFeeds, setLoadingFeeds] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const videoRef = useRef(null);
    const containerRef = useRef(null);

    const fetchFeeds = useCallback(async () => {
        setLoadingFeeds(true);
        try {
            const res = await sosService.getEmergencyVideoFeeds(streamData.id);
            if (res.success) {
                setVideoFeeds(res.data.video_feeds);
                setCurrentIndex(0);
                setError(null);
                setLoading(false);
            } else {
                setError('Unable to fetch video feeds');
            }
        } catch (e) {
            setError('Failed to connect to video service');
        } finally {
            setLoadingFeeds(false);
        }
    }, [streamData.id]);

    useEffect(() => {
        fetchFeeds();
        const interval = setInterval(fetchFeeds, 20000);
        return () => clearInterval(interval);
    }, [fetchFeeds]);

    useEffect(() => {
        const handleKeyDown = e => {
            if (e.key === 'Escape') onClose();
            if (e.key === ' ') { e.preventDefault(); togglePlayPause(); }
            if (e.key === 'ArrowRight') nextChunk();
            if (e.key === 'ArrowLeft') prevChunk();
            if (e.key.toLowerCase() === 'f') toggleFullscreen();
            if (e.key.toLowerCase() === 'i') setSidebarOpen(prev => !prev);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        // Auto-hide controls
        const hideTimer = setTimeout(() => setShowControls(false), 3000);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
            clearTimeout(hideTimer);
        };
    }, [onClose]);

    const currentUrl = videoFeeds[currentIndex]?.video_url;

    // Video event handlers
    const handleVideoLoaded = () => {
        setLoading(false);
        setError(null);
        // console.log(videoRef)
        if (videoRef.current) setDuration(videoRef.current.duration);
    };

    const handleVideoError = () => {
        setError('Video playback failed');
        setLoading(false);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (videoRef.current.buffered.length > 0) {
                const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
                setBuffered((bufferedEnd / videoRef.current.duration) * 100);
            }
        }
    };

    // Control functions
    const togglePlayPause = () => {
        if (!videoRef.current) return;
        if (playing) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
        setMuted(videoRef.current.muted);
    };

    const handleVolumeChange = e => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) videoRef.current.volume = newVolume;
    };

    const handleSeek = e => {
        if (!videoRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;
        const newTime = percent * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const prevChunk = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setLoading(true);
        }
    };

    const nextChunk = () => {
        if (currentIndex < videoFeeds.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setLoading(true);
        }
    };

    const selectChunk = idx => {
        setCurrentIndex(idx);
        setLoading(true);
        setSidebarOpen(false);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // Utility functions
    const formatTime = seconds => {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimestamp = timestamp => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="relative w-full max-w-7xl mx-4 bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                    ref={containerRef}
                    onMouseMove={() => setShowControls(true)}
                >
                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-white">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="font-bold">LIVE</span>
                                </div>
                                <h2 className="text-lg font-semibold">
                                    Emergency Video Feed #{streamData.id}
                                </h2>
                                {videoFeeds.length > 0 && (
                                    <span className="bg-white/20 px-2 py-1 rounded-full text-sm">
                                        {currentIndex + 1}/{videoFeeds.length}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Toggle Info Panel (I)"
                                >
                                    <Info className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={fetchFeeds}
                                    disabled={loadingFeeds}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Refresh Feeds"
                                >
                                    <RefreshCw className={`w-5 h-5 ${loadingFeeds ? 'animate-spin' : ''}`} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                                    title="Close (Esc)"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex">
                        {/* Video Container */}
                        <div className="flex-1 relative bg-black">
                            {/* Loading State */}
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
                                    <div className="text-center text-white">
                                        <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-xl font-semibold">Loading Video Feed...</p>
                                        <p className="text-gray-400 mt-2">Emergency ID: {streamData.id}</p>
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {error && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-900/80 z-20">
                                    <div className="text-center text-white bg-black/60 rounded-2xl p-8">
                                        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold mb-2">Playback Error</h3>
                                        <p className="text-red-200 mb-4">{error}</p>
                                        <button
                                            onClick={() => {
                                                setError(null);
                                                fetchFeeds();
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Video Element */}
                            {currentUrl && (
                                <video
                                    ref={videoRef}
                                    src={currentUrl}
                                    className="w-full h-[80vh] object-contain"
                                    controls={false}
                                    muted={muted}
                                    playsInline
                                    onLoadedData={handleVideoLoaded}
                                    onError={handleVideoError}
                                    onTimeUpdate={handleTimeUpdate}
                                    onPlay={() => setPlaying(true)}
                                    onPause={() => setPlaying(false)}
                                    style={{ backgroundColor: '#000' }}
                                />
                            )}

                            {/* Video Controls */}
                            <AnimatePresence>
                                {showControls && !loading && currentUrl && !error && (
                                    <motion.div
                                        className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 to-transparent p-4"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                    >
                                        {/* Progress Bar */}
                                        <div className="mb-4">
                                            <div
                                                className="w-full h-2 bg-white/20 rounded-full cursor-pointer relative group"
                                                onClick={handleSeek}
                                            >
                                                {/* Buffered Progress */}
                                                <div
                                                    className="absolute h-2 bg-white/40 rounded-full"
                                                    style={{ width: `${buffered}%` }}
                                                />
                                                {/* Current Progress */}
                                                <div
                                                    className="absolute h-2 bg-red-500 rounded-full"
                                                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                                />
                                                {/* Progress Thumb */}
                                                <div
                                                    className="absolute w-4 h-4 bg-red-500 rounded-full -top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    style={{
                                                        left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                                                        marginLeft: '-8px'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Control Buttons */}
                                        <div className="flex items-center justify-between text-white">
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={prevChunk}
                                                    disabled={currentIndex === 0}
                                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                                                >
                                                    <SkipBack className="w-5 h-5" />
                                                </button>

                                                <button
                                                    onClick={togglePlayPause}
                                                    className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                                                >
                                                    {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                                </button>

                                                <button
                                                    onClick={nextChunk}
                                                    disabled={currentIndex === videoFeeds.length - 1}
                                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                                                >
                                                    <SkipForward className="w-5 h-5" />
                                                </button>

                                                <span className="text-sm font-mono">
                                                    {formatTime(currentTime)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={toggleMute}
                                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                                >
                                                    {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                                </button>

                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.05"
                                                    value={volume}
                                                    onChange={handleVolumeChange}
                                                    className="w-20 accent-red-500"
                                                />

                                                <button
                                                    onClick={toggleFullscreen}
                                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                                                >
                                                    <Fullscreen className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sidebar */}
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.div
                                    className="w-80 bg-white border-l border-gray-200 flex flex-col max-h-[80vh]"
                                    initial={{ x: 320, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: 320, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                >
                                    {/* Sidebar Header - Moved below top bar level */}
                                    <div className="p-4 border-b border-gray-200 mt-10">
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={() => setActiveTab('details')}
                                                className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${activeTab === 'details'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                Emergency Details
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('chunks')}
                                                className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${activeTab === 'chunks'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                    }`}
                                            >
                                                Video Chunks ({videoFeeds.length})
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sidebar Content */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        {activeTab === 'details' && (
                                            <div className="space-y-4">
                                                {/* Emergency Info Card */}
                                                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <AlertTriangle className="w-5 h-5 text-red-600" />
                                                        <span className="font-bold text-red-900">
                                                            {streamData.emergency_type || 'EMERGENCY'}
                                                        </span>
                                                    </div>
                                                    <p className="text-red-800 font-semibold">
                                                        ID: #{streamData.id}
                                                    </p>
                                                </div>

                                                {/* Reporter Info */}
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <User className="w-4 h-4 text-gray-600" />
                                                        <span className="font-semibold text-gray-900">Reporter</span>
                                                    </div>
                                                    <p className="text-gray-700">{streamData.user_name || 'Anonymous'}</p>
                                                </div>

                                                {/* Location Info */}
                                                {streamData.latitude && streamData.longitude && (
                                                    <div className="bg-gray-50 rounded-xl p-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <MapPin className="w-4 h-4 text-gray-600" />
                                                            <span className="font-semibold text-gray-900">Location</span>
                                                        </div>
                                                        <p className="text-gray-700 font-mono text-sm mb-2">
                                                            {streamData.latitude.toFixed(6)}, {streamData.longitude.toFixed(6)}
                                                        </p>
                                                        <button
                                                            onClick={() => window.open(
                                                                `https://maps.google.com/?q=${streamData.latitude},${streamData.longitude}`,
                                                                '_blank'
                                                            )}
                                                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            View on Maps
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Time Info */}
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="w-4 h-4 text-gray-600" />
                                                        <span className="font-semibold text-gray-900">Started</span>
                                                    </div>
                                                    <p className="text-gray-700">
                                                        {new Date(streamData.created_at).toLocaleString()}
                                                    </p>
                                                </div>

                                                {/* Description */}
                                                {streamData.description && (
                                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                                        <h4 className="font-semibold text-yellow-900 mb-2">Description</h4>
                                                        <p className="text-yellow-800 leading-relaxed">
                                                            {streamData.description}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === 'chunks' && (
                                            <div className="space-y-3">
                                                {videoFeeds.length > 0 ? (
                                                    videoFeeds.map((feed, index) => (
                                                        <motion.button
                                                            key={feed.id}
                                                            onClick={() => selectChunk(index)}
                                                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${index === currentIndex
                                                                ? 'bg-red-50 border-red-300 shadow-lg'
                                                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="font-semibold">
                                                                    Chunk {feed.chunk_sequence}
                                                                    {index === currentIndex && (
                                                                        <span className="ml-2 text-red-600">● Now Playing</span>
                                                                    )}
                                                                </span>
                                                                <span className="text-sm text-gray-500">
                                                                    {feed.file_size_formatted || 'Unknown size'}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                {formatTimestamp(feed.timestamp)}
                                                            </div>
                                                            {feed.duration && (
                                                                <div className="text-sm text-blue-600 mt-1">
                                                                    Duration: {formatTime(feed.duration)}
                                                                </div>
                                                            )}
                                                        </motion.button>
                                                    ))
                                                ) : (
                                                    <div className="text-center text-gray-500 py-8">
                                                        <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                        <p>No video chunks available yet</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VideoStreamModal;
