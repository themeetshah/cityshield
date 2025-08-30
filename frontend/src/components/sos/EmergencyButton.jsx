import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSOSContext } from '../../context/SOSContext';

const EmergencyButton = () => {
    const { sosActive, isProcessing, activateSOS, deactivateSOS } = useSOSContext();
    const [showConfirm, setShowConfirm] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const countdownRef = useRef(null);
    const emergencyTriggeredRef = useRef(false);
    const isUnmountedRef = useRef(false);

    const emergencyContacts = [
        { number: '112', label: 'Emergency' },
        { number: '100', label: 'Police' },
        { number: '108', label: 'Ambulance' },
        { number: '101', label: 'Fire' }
    ];

    // Enhanced countdown with proper cleanup and guards
    const startCountdown = useCallback(() => {
        console.log('Starting countdown...', {
            countdown,
            isProcessing,
            sosActive,
            emergencyTriggered: emergencyTriggeredRef.current
        });

        // Prevent starting if already active or processing
        if (isProcessing || sosActive || countdown !== null || emergencyTriggeredRef.current) {
            console.log('Countdown blocked - already active');
            return;
        }

        // Clear any existing countdown first
        if (countdownRef.current) {
            console.log('Clearing existing countdown interval');
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        setShowConfirm(true);
        setCountdown(5);

        countdownRef.current = setInterval(() => {
            if (isUnmountedRef.current) {
                clearInterval(countdownRef.current);
                return;
            }

            setCountdown(prev => {
                console.log('Countdown tick:', prev);

                if (prev <= 1) {
                    console.log('Countdown reached zero, triggering emergency');
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;

                    // Use setTimeout to prevent race conditions
                    setTimeout(() => {
                        if (!isUnmountedRef.current && !emergencyTriggeredRef.current) {
                            handleEmergency();
                        }
                    }, 0);

                    return null;
                }
                return prev - 1;
            });
        }, 1000);
    }, [isProcessing, sosActive, countdown]);

    // Enhanced cancel with proper cleanup
    const cancelCountdown = useCallback(() => {
        console.log('Cancelling countdown');

        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        setCountdown(null);
        setShowConfirm(false);
        emergencyTriggeredRef.current = false;
    }, []);

    // Enhanced location getter with better error handling
    const getCurrentLocation = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const timeoutId = setTimeout(() => {
                reject(new Error('Location request timed out'));
            }, 10000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    resolve(position);
                },
                (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }, []);

    // Enhanced emergency handler with strong guards
    const handleEmergency = useCallback(async () => {
        console.log('handleEmergency called:', {
            isProcessing,
            sosActive,
            countdown,
            emergencyTriggered: emergencyTriggeredRef.current,
            timestamp: new Date().toISOString()
        });

        // Strong guard against multiple calls
        if (isProcessing || sosActive || emergencyTriggeredRef.current || isUnmountedRef.current) {
            console.log('Emergency blocked:', {
                isProcessing,
                sosActive,
                emergencyTriggered: emergencyTriggeredRef.current,
                isUnmounted: isUnmountedRef.current
            });
            return;
        }

        // Set guard flag immediately
        emergencyTriggeredRef.current = true;

        // Clear any running countdown
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }

        // Reset UI state
        setShowConfirm(false);
        setCountdown(null);

        try {
            console.log('Getting current location...');
            // Get current location
            const position = await getCurrentLocation();
            const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            // console.log('Location obtained, activating SOS...');
            // console.log('=============================')
            // console.log(location)
            // console.log(location.latitude)
            // console.log('=============================')

            // Activate SOS through context (this will handle navigation)
            await activateSOS({
                location,
                timestamp: new Date().toISOString(),
                emergency_type: 'general_emergency'
            });

            console.log('SOS activated successfully');

            // Voice alert
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(
                    'Emergency alert activated. You are being redirected to the safety map with directions to the nearest safe location.'
                );
                utterance.rate = 0.9;
                utterance.pitch = 1;
                window.speechSynthesis.speak(utterance);
            }

        } catch (error) {
            console.error('Emergency activation failed:', error);

            // Reset guard flag on error
            emergencyTriggeredRef.current = false;

            alert(`Emergency activation failed: ${error}. Please call 112 directly.`);

            // Fallback to phone call
            if (window.confirm('Open phone to call emergency services (112)?')) {
                window.location.href = 'tel:112';
            }
        }
    }, [isProcessing, sosActive, getCurrentLocation, activateSOS]);

    // Enhanced cancel handler
    const handleCancel = useCallback(() => {
        console.log('Handling cancel emergency');

        try {
            deactivateSOS();
            emergencyTriggeredRef.current = false;

            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance('Emergency alert cancelled. You are now marked as safe.');
                window.speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error('Error cancelling emergency:', error);
        }
    }, [deactivateSOS]);

    // Enhanced cleanup effect
    useEffect(() => {
        // Reset unmounted flag on mount
        isUnmountedRef.current = false;

        return () => {
            console.log('EmergencyButton unmounting - cleaning up');
            isUnmountedRef.current = true;

            if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
            }

            // Reset flags
            emergencyTriggeredRef.current = false;
        };
    }, []);

    // Reset emergency triggered flag when SOS becomes inactive
    useEffect(() => {
        if (!sosActive) {
            emergencyTriggeredRef.current = false;
        }
    }, [sosActive]);

    // Emergency confirmation modal
    if (showConfirm) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-0">
                <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl animate-pulse border-4 border-red-500">
                    <div className="text-center">
                        <div className="text-6xl mb-4 animate-bounce">🚨</div>
                        <h3 className="text-2xl font-bold text-red-600 mb-4">Emergency Alert</h3>
                        <p className="text-gray-700 mb-4">
                            Emergency services will be notified in
                        </p>
                        <div className="text-6xl font-bold text-red-600 mb-4 animate-pulse">
                            {countdown}
                        </div>
                        <div className="text-sm text-gray-600 mb-6 space-y-1">
                            <p>✓ Your location will be shared with authorities</p>
                            <p>✓ You'll be redirected to safety map</p>
                            <p>✓ Directions to nearest safe place</p>
                            <p>✓ Nearby volunteers will be alerted</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={handleEmergency}
                                disabled={emergencyTriggeredRef.current}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {emergencyTriggeredRef.current ? 'Processing...' : 'Send Alert Now'}
                            </button>
                            <button
                                onClick={cancelCountdown}
                                disabled={emergencyTriggeredRef.current}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-6 rounded-2xl transition-all duration-200 disabled:opacity-30"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Active emergency state
    if (sosActive) {
        return (
            <div className="fixed bottom-1 right-6 z-50">
                <div className="bg-red-600 text-white p-2 rounded-3xl shadow-2xl max-w-sm border-4 border-red-500 animate-pulse">
                    <div className="text-center">
                        {/* <div className="text-3xl mb-4 animate-bounce">🚨</div> */}
                        <h3 className="font-bold text-lg mb-3">🚨 EMERGENCY ACTIVE</h3>
                        {/* <p className="text-sm mb-4 leading-relaxed">
                            Emergency alert sent! You are on the safety map with directions to the nearest safe location.
                        </p> */}
                        <button
                            onClick={handleCancel}
                            className="w-full bg-white text-red-600 font-bold px-4 rounded-2xl hover:bg-gray-100 transition-all duration-200"
                        >
                            I'm Safe - End Emergency
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default emergency button
    return (
        <button
            onClick={startCountdown}
            disabled={isProcessing || emergencyTriggeredRef.current}
            className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-full shadow-2xl transform hover:scale-110 transition-all duration-300 z-50 disabled:opacity-50 flex items-center justify-center group"
            aria-label="Emergency SOS Button"
        >
            {(isProcessing || emergencyTriggeredRef.current) ? (
                <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <>
                    <span className="text-2xl animate-pulse">🚨</span>
                    {/* Pulse animation rings */}
                    <div className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-30"></div>
                    <div className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-20" style={{ animationDelay: '0.5s' }}></div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                        Emergency SOS
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                </>
            )}
        </button>
    );
};

export default EmergencyButton;
