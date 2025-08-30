import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import sosService from '../services/sos';
import { toast } from 'react-hot-toast';

const SOSContext = createContext();

export const useSOSContext = () => {
    const context = useContext(SOSContext);
    if (!context) {
        throw new Error('useSOSContext must be used within SOSProvider');
    }
    return context;
};

// **NEW: Mini Video Player Component**
const MiniVideoPlayer = ({ stream, isRecording, onClose }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
        }

        return () => {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
            }
        };
    }, [stream]);

    if (!stream) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '200px',
            height: '150px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#000',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            border: '2px solid #ff4444',
            zIndex: 9999
        }}>
            {/* Video Element */}
            <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)' // Mirror effect for front camera
                }}
            />

            {/* Recording Indicator */}
            <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(0,0,0,0.7)',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#fff'
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isRecording ? '#ff4444' : '#666',
                    animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                }} />
                <span style={{ fontWeight: 'bold' }}>
                    {isRecording ? 'REC' : 'PAUSED'}
                </span>
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    color: '#333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                title="Hide video preview"
            >
                ✕
            </button>

            {/* Title */}
            <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.7)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#fff',
                textAlign: 'center',
                fontWeight: 'bold'
            }}>
                📹 Live Feed to Police
            </div>
        </div>
    );
};

export const SOSProvider = ({ children }) => {
    const [sosActive, setSosActive] = useState(false);
    const [sosData, setSosData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Camera feed states
    const [cameraStream, setCameraStream] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [showMiniPlayer, setShowMiniPlayer] = useState(false); // **NEW: Control mini player visibility**

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunkCounterRef = useRef(0);
    const recordingIntervalRef = useRef(null);
    const isRecordingRef = useRef(false);
    const navigate = useNavigate();

    // Polling to detect external SOS resolution
    const pollIntervalRef = useRef(null);
    const [lastCheckedStatus, setLastCheckedStatus] = useState(null);

    // **NEW: Add CSS for pulse animation**
    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Check if SOS was resolved externally
    const checkSOSStatus = async () => {
        if (!sosActive || !sosData?.sosId) return;

        try {
            const response = await sosService.getSOSById(sosData.sosId);

            if (!response.is_active && lastCheckedStatus !== 'resolved') {
                console.log('🔄 SOS was resolved externally by authorities');
                setLastCheckedStatus('resolved');
                await endEmergencyMode();
                toast.success('🚔 Emergency resolved by police authorities', {
                    duration: 5000,
                    icon: '✅'
                });
                window.location.href = '/safety-map'; // Redirect to safety map
            }
        } catch (error) {
            console.warn('Failed to check SOS status:', error);
        }
    };

    // Start/stop polling when SOS is active
    useEffect(() => {
        if (sosActive && sosData?.sosId) {
            console.log('🔍 Starting SOS status polling...');
            setLastCheckedStatus('active');
            checkSOSStatus();
            pollIntervalRef.current = setInterval(checkSOSStatus, 10000);
        } else {
            if (pollIntervalRef.current) {
                console.log('⏹️ Stopping SOS status polling');
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
            setLastCheckedStatus(null);
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [sosActive, sosData?.sosId]);

    // Manual chunking for discrete 10-second segments
    const recordVideoChunk = (sosId) => {
        if (!streamRef.current || !isRecordingRef.current) {
            console.log('🛑 Recording stopped or stream unavailable');
            return;
        }

        try {
            const chunks = [];
            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                    ? 'video/webm;codecs=vp9'
                    : 'video/webm'
            });

            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                if (chunks.length > 0) {
                    const chunkNumber = ++chunkCounterRef.current;
                    const videoBlob = new Blob(chunks, { type: 'video/webm' });

                    if (videoBlob.size > 1000) {
                        console.log(`📹 Discrete chunk ${chunkNumber} ready (${videoBlob.size} bytes)`);
                        try {
                            await sendVideoToPolice(sosId, videoBlob, chunkNumber);
                            console.log(`✅ Discrete chunk ${chunkNumber} uploaded successfully`);
                        } catch (error) {
                            console.error(`❌ Failed to upload chunk ${chunkNumber}:`, error);
                        }
                    } else {
                        console.log(`⚠️ Skipping tiny chunk ${chunkNumber} (${videoBlob.size} bytes)`);
                    }

                    if (isRecordingRef.current) {
                        setTimeout(() => recordVideoChunk(sosId), 100);
                    }
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error('❌ MediaRecorder error:', event.error);
            };

            mediaRecorder.start();
            console.log(`🔴 Started recording chunk ${chunkCounterRef.current + 1}`);

            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 10000);

        } catch (error) {
            console.error('❌ Error in recordVideoChunk:', error);
        }
    };

    const startCameraFeed = async (sosId) => {
        try {
            console.log('🎥 Starting camera feed for SOS:', sosId);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            });

            setCameraStream(stream);
            streamRef.current = stream;
            setIsStreaming(true);
            setShowMiniPlayer(true); // **NEW: Show mini player when camera starts**
            isRecordingRef.current = true;
            chunkCounterRef.current = 0;

            // Start manual chunking process
            recordVideoChunk(sosId);

            toast.success('📹 Live camera feed started - sending to authorities', {
                duration: 4000
            });
        } catch (error) {
            console.error('❌ Failed to start camera feed:', error);
            toast.error('Failed to start camera feed: ' + error.message);
        }
    };

    const sendVideoToPolice = async (sosId, videoBlob, chunkNumber) => {
        try {
            const location = sosData?.location;
            await sosService.sendCameraFeedToPolice(videoBlob, sosId, chunkNumber, location);
            console.log(`📤 Discrete chunk ${chunkNumber} sent: ${videoBlob.size} bytes`);
        } catch (error) {
            console.error('❌ Failed to send video to police:', error);
            throw error;
        }
    };

    const stopCameraFeed = () => {
        try {
            console.log('🛑 Stopping camera feed...');

            isRecordingRef.current = false;

            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }

            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            setCameraStream(null);
            setIsStreaming(false);
            setShowMiniPlayer(false); // **NEW: Hide mini player when camera stops**
            chunkCounterRef.current = 0;
            mediaRecorderRef.current = null;

            console.log('📹 Camera feed stopped successfully');
        } catch (error) {
            console.error('❌ Error stopping camera feed:', error);
        }
    };

    const endEmergencyMode = async () => {
        console.log('🔚 Ending emergency mode...');

        try {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }

            stopCameraFeed();

            setSosActive(false);
            setSosData(null);
            setIsProcessing(false);
            setLastCheckedStatus(null);

            navigate('/safety-map', {
                replace: true,
                state: { emergencyMode: false }
            });

            console.log('✅ Emergency mode ended successfully');
        } catch (error) {
            console.error('❌ Error ending emergency mode:', error);
            setSosActive(false);
            setSosData(null);
            setIsProcessing(false);
        }
    };

    const forceEndEmergency = async () => {
        console.log('🚨 Force ending emergency mode (external resolution)');
        await endEmergencyMode();
        toast.success('🏁 Emergency resolved - returning to safety mode', {
            duration: 4000
        });
    };

    const activateSOS = async (emergencyData) => {
        if (isProcessing) {
            console.log('⏳ SOS activation already in progress');
            return;
        }

        setIsProcessing(true);
        console.log('🚨 Activating SOS with data:', emergencyData);

        try {
            const sosResponse = await sosService.createEmergencyAlert(emergencyData);
            console.log('✅ SOS created with ID:', sosResponse.sos_id);

            const safeLocationResponse = await sosService.findNearestSafeLocation(emergencyData.location);

            const fullSOSData = {
                ...emergencyData,
                sosId: sosResponse.sos_id,
                nearestSafeLocation: safeLocationResponse.nearest_location,
                timestamp: new Date().toISOString(),
                status: 'active'
            };

            setSosData(fullSOSData);
            setSosActive(true);

            // Start camera feed automatically
            await startCameraFeed(sosResponse.sos_id);

            navigate('/safety-map', {
                state: {
                    emergencyMode: true,
                    sosData: fullSOSData
                }
            });

            toast.success('🚨 Emergency alert activated!', { duration: 3000 });
            return fullSOSData;

        } catch (error) {
            console.error('❌ SOS activation failed:', error);
            toast.error('Failed to activate emergency alert: ' + error.message);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    const deactivateSOS = async () => {
        console.log('🔚 Deactivating SOS manually...');

        if (sosData?.sosId) {
            try {
                await sosService.resolveSOS(sosData.sosId);
                console.log('✅ SOS resolved on backend');
                window.location.href = '/safety-map'; // Redirect to safety map
            } catch (error) {
                console.error('❌ Failed to resolve SOS on backend:', error);
                toast.error('Failed to resolve SOS on server, but ending locally');
            }
        }

        await endEmergencyMode();
    };

    const updateSOSLocation = async (newLocation) => {
        if (sosActive && sosData?.sosId) {
            try {
                await sosService.sendLocationUpdate(sosData.sosId, newLocation);
                setSosData(prev => ({
                    ...prev,
                    location: newLocation
                }));
                console.log('📍 SOS location updated:', newLocation);
            } catch (error) {
                console.error('❌ Failed to update SOS location:', error);
            }
        }
    };

    // **NEW: Toggle mini player visibility**
    const toggleMiniPlayer = () => {
        setShowMiniPlayer(!showMiniPlayer);
    };

    const isInEmergency = () => {
        return sosActive && sosData && sosData.status === 'active';
    };

    const getEmergencyDuration = () => {
        if (!sosActive || !sosData?.timestamp) return 0;

        const start = new Date(sosData.timestamp);
        const now = new Date();
        return Math.floor((now - start) / 1000);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            console.log('🧹 Cleaning up SOSContext...');
            stopCameraFeed();
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const value = {
        // Core state
        sosActive,
        sosData,
        isProcessing,
        cameraStream,
        isStreaming,
        showMiniPlayer,      // **NEW: Expose mini player state**

        // Core methods
        activateSOS,
        deactivateSOS,
        updateSOSLocation,

        // Camera methods
        startCameraFeed,
        stopCameraFeed,

        // Enhanced methods
        endEmergencyMode,
        forceEndEmergency,
        isInEmergency,
        getEmergencyDuration,
        toggleMiniPlayer,    // **NEW: Toggle mini player**

        // Status tracking
        lastCheckedStatus
    };

    return (
        <SOSContext.Provider value={value}>
            {children}
            {/* **NEW: Render Mini Video Player when conditions are met** */}
            {showMiniPlayer && cameraStream && (
                <MiniVideoPlayer
                    stream={cameraStream}
                    isRecording={isRecordingRef.current}
                    onClose={() => setShowMiniPlayer(false)}
                />
            )}
        </SOSContext.Provider>
    );
};

export default SOSProvider;
