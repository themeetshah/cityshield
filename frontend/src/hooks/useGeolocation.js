import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_OPTIONS = { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 };

const describeError = (err) => {
    if (!err) return null;
    switch (err.code) {
        case 1:
            return 'Location permission denied. Enable location access, or choose your position on the map.';
        case 2:
            return 'Your location is unavailable right now.';
        case 3:
            return 'Timed out while getting your location.';
        default:
            return err.message || 'Could not get your location.';
    }
};

const toLocation = (pos) => ({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
});

/** One-shot position as a promise: { latitude, longitude, accuracy, timestamp }. */
export const getCurrentPosition = (options = {}) =>
    new Promise((resolve, reject) => {
        if (!('geolocation' in navigator)) {
            reject(new Error('Geolocation is not supported by this browser.'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve(toLocation(pos)),
            (err) => reject(new Error(describeError(err))),
            { ...DEFAULT_OPTIONS, ...options }
        );
    });

/**
 * Real device location only - never returns a made-up fallback.
 * `location` is null until a fix is obtained; `error` explains why it is missing.
 * `setManualLocation` lets the user pick a point (e.g. by clicking a map); `isManual` is then true.
 *
 * @param {{ watch?: boolean, enabled?: boolean, options?: PositionOptions }} config
 */
const useGeolocation = ({ watch = false, enabled = true, options } = {}) => {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [isManual, setIsManual] = useState(false);
    const optionsRef = useRef({ ...DEFAULT_OPTIONS, ...options });
    const manualRef = useRef(false);

    const onSuccess = useCallback((pos) => {
        if (manualRef.current) return;
        setLocation(toLocation(pos));
        setError(null);
        setLoading(false);
    }, []);

    const onError = useCallback((err) => {
        setError(describeError(err));
        setLoading(false);
    }, []);

    const refresh = useCallback(() => {
        manualRef.current = false;
        setIsManual(false);
        if (!('geolocation' in navigator)) {
            setError('Geolocation is not supported by this browser.');
            setLoading(false);
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(onSuccess, onError, optionsRef.current);
    }, [onSuccess, onError]);

    const setManualLocation = useCallback((latitude, longitude) => {
        manualRef.current = true;
        setIsManual(true);
        setLocation({ latitude, longitude, accuracy: null, timestamp: Date.now() });
        setError(null);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!enabled) return undefined;
        if (!('geolocation' in navigator)) {
            setError('Geolocation is not supported by this browser.');
            setLoading(false);
            return undefined;
        }
        if (watch) {
            const id = navigator.geolocation.watchPosition(onSuccess, onError, optionsRef.current);
            return () => navigator.geolocation.clearWatch(id);
        }
        navigator.geolocation.getCurrentPosition(onSuccess, onError, optionsRef.current);
        return undefined;
    }, [enabled, watch, onSuccess, onError]);

    return { location, error, loading, isManual, refresh, setManualLocation };
};

export default useGeolocation;
