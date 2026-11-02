/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import sosService from '../services/sos';
import { errorMessage } from '../services/api';
import { distanceMeters } from '../services/location';
import { getCurrentPosition } from '../hooks/useGeolocation';
import { useAuth } from './AuthContext';
import CameraPreview from '../components/sos/CameraPreview';
import { SegmentRecorder, UploadQueue, openCamera } from '../components/sos/sosMedia';

/**
 * Owns the whole lifecycle of the user's own SOS:
 * create -> live location tracking -> camera recording/upload -> resolve.
 * The active SOS ({ sosId, sosToken }) is persisted so a reload never orphans it.
 * Pages must NOT send SOS location updates themselves.
 */

const SOSContext = createContext(null);

const STORAGE_KEY = 'cityshield.activeSOS';
const LOCATION_MIN_INTERVAL_MS = 10000;
const LOCATION_MIN_MOVE_M = 20;
const LOCATION_HARD_MIN_MS = 3000; // server ignores updates closer than 3 s
const STATUS_POLL_MS = 15000;
const FINAL_UPLOAD_WAIT_MS = 8000;

const readStored = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        return parsed && Number.isInteger(parsed.sosId) ? parsed : null;
    } catch {
        return null;
    }
};

const writeStored = (value) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
        // storage unavailable (private mode) - the SOS still works for this page load
    }
};

const clearStored = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
};

const httpStatus = (err) => err?.response?.status;

const withTimeout = (promise, ms) =>
    Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

export const useSOSContext = () => {
    const context = useContext(SOSContext);
    if (!context) throw new Error('useSOSContext must be used within SOSProvider');
    return context;
};

export const SOSProvider = ({ children }) => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // { sosId, sosToken, emergencyType, createdAt, chunkCounter }
    const sessionRef = useRef(readStored());
    const [sosId, setSosId] = useState(() => sessionRef.current?.sosId ?? null);
    const [sosData, setSosData] = useState(() => (sessionRef.current
        ? {
            sosId: sessionRef.current.sosId,
            emergencyType: sessionRef.current.emergencyType,
            createdAt: sessionRef.current.createdAt,
            location: null,
            nearestSafeLocation: null,
        }
        : null));
    const [isProcessing, setIsProcessing] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [lastLocation, setLastLocation] = useState(null);
    const [error, setError] = useState(null);

    const processingRef = useRef(false);
    const streamRef = useRef(null);
    const cameraStartingRef = useRef(false);
    const recorderRef = useRef(null);
    const queueRef = useRef(null);
    const sentRef = useRef({ at: 0, point: null, inFlight: false });

    const persist = useCallback(() => {
        if (sessionRef.current) writeStored(sessionRef.current);
    }, []);

    // ---------------------------------------------------------------- camera

    const stopCamera = useCallback(() => {
        recorderRef.current?.stop();
        recorderRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraStream(null);
    }, []);

    const startCamera = useCallback(async () => {
        const session = sessionRef.current;
        if (!session || streamRef.current || cameraStartingRef.current) return;
        cameraStartingRef.current = true;
        let stream;
        try {
            stream = await openCamera();
        } catch (err) {
            toast.error(`Camera not shared: ${err.message}`);
            return;
        } finally {
            cameraStartingRef.current = false;
        }
        if (sessionRef.current !== session) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }
        const queue = new UploadQueue(
            (item) => sosService.uploadVideoChunk(item.sosId, item.sosToken, item.blob, {
                chunkNumber: item.chunkNumber,
                duration: item.duration,
            }),
            {
                onPermanentFailure: (_item, err) => {
                    if (httpStatus(err) === 409) recorderRef.current?.stop();
                },
            }
        );
        const recorder = new SegmentRecorder(stream, (blob, duration) => {
            const current = sessionRef.current;
            if (!current || current.sosId !== session.sosId) return;
            current.chunkCounter = (current.chunkCounter || 0) + 1;
            persist();
            queue.push({
                sosId: current.sosId,
                sosToken: current.sosToken,
                blob,
                duration,
                chunkNumber: current.chunkCounter,
            });
        });
        if (!recorder.supported) {
            stream.getTracks().forEach((track) => track.stop());
            toast.error('This browser cannot record video. Your location is still being shared.');
            return;
        }
        streamRef.current = stream;
        queueRef.current = queue;
        recorderRef.current = recorder;
        setCameraStream(stream);
        recorder.start();
    }, [persist]);

    // ---------------------------------------------------------------- session

    const endLocally = useCallback(() => {
        stopCamera();
        queueRef.current?.close();
        queueRef.current = null;
        sessionRef.current = null;
        sentRef.current = { at: 0, point: null, inFlight: false };
        clearStored();
        setSosId(null);
        setSosData(null);
        setLastLocation(null);
        setError(null);
    }, [stopCamera]);

    /** Ask the server whether our SOS is still active; end locally if not. */
    const checkStatus = useCallback(async () => {
        const session = sessionRef.current;
        if (!session) return null;
        try {
            const data = await sosService.getSOSById(session.sosId, { sosToken: session.sosToken });
            if (sessionRef.current !== session) return null;
            if (!data.is_active) {
                endLocally();
                toast.success('Your SOS has been marked resolved.');
                return false;
            }
            if (data.video_chunks_count > (session.chunkCounter || 0)) {
                session.chunkCounter = data.video_chunks_count;
                persist();
            }
            setSosData((prev) => ({
                ...prev,
                emergencyType: data.emergency_type,
                department: data.department,
                responders: data.responders_count,
                volunteersAlerted: data.volunteers_alerted,
                location: prev?.location || { latitude: data.latitude, longitude: data.longitude },
            }));
            return true;
        } catch (err) {
            const code = httpStatus(err);
            if (code === 403 || code === 404) {
                endLocally();
                toast.error('This SOS can no longer be managed from this device.');
                return false;
            }
            return null; // network trouble: keep the SOS active and try again later
        }
    }, [endLocally, persist]);

    // Rehydrate a persisted SOS once on load.
    useEffect(() => {
        if (!sessionRef.current) return;
        checkStatus().then((active) => {
            if (active !== false) startCamera();
        });
    }, [checkStatus, startCamera]);

    // Poll for resolution by responders while active.
    useEffect(() => {
        if (!sosId) return undefined;
        const timer = setInterval(checkStatus, STATUS_POLL_MS);
        return () => clearInterval(timer);
    }, [sosId, checkStatus]);

    // ---------------------------------------------------------------- live location

    const handlePosition = useCallback((pos) => {
        const session = sessionRef.current;
        if (!session) return;
        const point = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
        };
        const sent = sentRef.current;
        const elapsed = Date.now() - sent.at;
        const moved = sent.point ? distanceMeters(sent.point, point) : Infinity;
        const due = elapsed >= LOCATION_MIN_INTERVAL_MS || (moved >= LOCATION_MIN_MOVE_M && elapsed >= LOCATION_HARD_MIN_MS);
        if (!due || sent.inFlight || !navigator.onLine) return;

        sentRef.current = { at: Date.now(), point, inFlight: true };
        setLastLocation(point);
        setSosData((prev) => (prev ? { ...prev, location: point } : prev));
        sosService
            .sendLocationUpdate(session.sosId, session.sosToken, point)
            .catch((err) => {
                const code = httpStatus(err);
                if (code === 409 || code === 403 || code === 404) checkStatus();
            })
            .finally(() => {
                sentRef.current.inFlight = false;
            });
    }, [checkStatus]);

    useEffect(() => {
        if (!sosId || !('geolocation' in navigator)) return undefined;
        const watchId = navigator.geolocation.watchPosition(
            handlePosition,
            () => setError('Live location is unavailable. Responders see your last known position.'),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [sosId, handlePosition]);

    // Release camera/microphone when the provider unmounts.
    useEffect(() => () => {
        recorderRef.current?.stop();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        queueRef.current?.close();
    }, []);

    // ---------------------------------------------------------------- public API

    const activateSOS = useCallback(async (emergencyType = 'general_emergency') => {
        if (sessionRef.current) return { sosId: sessionRef.current.sosId, alreadyActive: true };
        if (processingRef.current) return null;
        processingRef.current = true;
        setIsProcessing(true);
        setError(null);
        try {
            if (!navigator.onLine) throw new Error('You are offline. Call 112 now.');
            let location;
            try {
                location = await getCurrentPosition({ maximumAge: 15000, timeout: 15000 });
            } catch (err) {
                throw new Error(`${err.message} Call 112 now.`, { cause: err });
            }

            let created;
            try {
                created = await sosService.createSOS({
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    emergencyType,
                });
            } catch (err) {
                throw new Error(errorMessage(err, 'Could not send the SOS.'), { cause: err });
            }

            // From here on the SOS exists; everything else is best-effort.
            const session = {
                sosId: created.sos_id,
                sosToken: created.sos_token || null,
                emergencyType: created.emergency_type,
                createdAt: created.created_at,
                chunkCounter: 0,
            };
            sessionRef.current = session;
            persist();
            sentRef.current = { at: Date.now(), point: location, inFlight: false };
            const data = {
                sosId: session.sosId,
                emergencyType: session.emergencyType,
                department: created.department,
                createdAt: session.createdAt,
                location,
                nearestSafeLocation: null,
                volunteersAlerted: created.volunteers_alerted ?? 0,
                emergencyServicesNotified: Boolean(created.emergency_services_notified),
            };
            setSosId(session.sosId);
            setSosData(data);
            setLastLocation(location);

            if (created.already_active) {
                toast('You already have an active SOS - it is still open.');
                startCamera();
                return data;
            }

            const parts = ['SOS sent.'];
            if (data.emergencyServicesNotified) parts.push('Emergency services notified.');
            if (data.volunteersAlerted > 0) parts.push(`${data.volunteersAlerted} nearby volunteer(s) alerted.`);
            toast.success(parts.join(' '), { duration: 6000 });

            startCamera();

            const safe = await withTimeout(
                sosService.findNearestSafeLocation(location).catch(() => null),
                5000
            );
            const nearestSafeLocation = safe?.nearest_location || null;
            if (nearestSafeLocation && sessionRef.current === session) {
                setSosData((prev) => (prev ? { ...prev, nearestSafeLocation } : prev));
            }
            const result = { ...data, nearestSafeLocation };
            if (isAuthenticated && sessionRef.current === session) {
                navigate('/safety-map', { state: { emergencyMode: true, sosData: result } });
            }
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            processingRef.current = false;
            setIsProcessing(false);
        }
    }, [isAuthenticated, navigate, persist, startCamera]);

    const deactivateSOS = useCallback(async () => {
        const session = sessionRef.current;
        if (!session || processingRef.current) return false;
        processingRef.current = true;
        setIsProcessing(true);
        try {
            // Finish and upload the current video segment before closing the SOS.
            recorderRef.current?.stop();
            await queueRef.current?.drain(FINAL_UPLOAD_WAIT_MS);
            try {
                await sosService.resolveSOS(session.sosId, { sosToken: session.sosToken });
            } catch (err) {
                const code = httpStatus(err);
                if (code !== 403 && code !== 404) {
                    // Keep the SOS open: closing it only locally would leave responders searching.
                    const message = errorMessage(err, 'Could not reach the server to end your SOS.');
                    setError(message);
                    if (recorderRef.current && streamRef.current) recorderRef.current.start();
                    throw new Error(message, { cause: err });
                }
            }
            endLocally();
            toast.success('SOS ended. Stay safe.');
            return true;
        } finally {
            processingRef.current = false;
            setIsProcessing(false);
        }
    }, [endLocally]);

    const value = useMemo(() => ({
        sosActive: sosId !== null,
        sosId,
        sosData,
        isProcessing,
        cameraActive: cameraStream !== null,
        lastLocation,
        error,
        activateSOS,
        deactivateSOS,
    }), [sosId, sosData, isProcessing, cameraStream, lastLocation, error, activateSOS, deactivateSOS]);

    return (
        <SOSContext.Provider value={value}>
            {children}
            {cameraStream && <CameraPreview stream={cameraStream} />}
        </SOSContext.Provider>
    );
};

export default SOSProvider;
