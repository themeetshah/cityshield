import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertTriangle, Camera, Loader2, MapPin, Phone, WifiOff, X } from 'lucide-react';
import { useSOSContext } from '../../context/SOSContext';
import { EMERGENCY_TYPES } from '../../services/sos';
import SOSDialog from './SOSDialog';

const COUNTDOWN_SECONDS = 5;

const useOnlineStatus = () => {
    const [online, setOnline] = useState(() => navigator.onLine);
    useEffect(() => {
        const up = () => setOnline(true);
        const down = () => setOnline(false);
        window.addEventListener('online', up);
        window.addEventListener('offline', down);
        return () => {
            window.removeEventListener('online', up);
            window.removeEventListener('offline', down);
        };
    }, []);
    return online;
};

const Call112 = ({ className = '' }) => (
    <a
        href="tel:112"
        className={`flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 font-bold text-white hover:bg-red-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 ${className}`}
    >
        <Phone className="h-5 w-5" aria-hidden="true" />
        Call 112
    </a>
);

/** Global SOS control - rendered once by App for anonymous users, citizens and volunteers. */
const EmergencyButton = () => {
    const { sosActive, isProcessing, cameraActive, lastLocation, activateSOS, deactivateSOS } = useSOSContext();
    const online = useOnlineStatus();

    const [phase, setPhase] = useState('idle'); // idle | confirm | end
    const [countdown, setCountdown] = useState(null);
    const [emergencyType, setEmergencyType] = useState('general_emergency');
    const [message, setMessage] = useState(null);
    const [pendingType, setPendingType] = useState(null); // activation waiting for connectivity
    const sendNowRef = useRef(null);
    const keepActiveRef = useRef(null);

    const send = useCallback(async (type) => {
        setPhase('idle');
        setCountdown(null);
        setMessage(null);
        if (!navigator.onLine) {
            setPendingType(type);
            setMessage('You are offline. Call 112 now - we will send your SOS automatically when you are back online.');
            return;
        }
        try {
            await activateSOS(type);
            setPendingType(null);
        } catch (err) {
            const offline = !navigator.onLine || /network|offline/i.test(err.message);
            setPendingType(offline ? type : null);
            setMessage(err.message || 'Could not send the SOS. Call 112 now.');
        }
    }, [activateSOS]);

    // Countdown -> automatic send with the chosen type.
    useEffect(() => {
        if (phase !== 'confirm' || countdown === null) return undefined;
        if (countdown <= 0) {
            send(emergencyType);
            return undefined;
        }
        const timer = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
        return () => clearTimeout(timer);
    }, [phase, countdown, emergencyType, send]);

    // Keep retrying a pending activation while/once the connection is back.
    useEffect(() => {
        if (!online || !pendingType || sosActive || isProcessing) return undefined;
        const timer = setTimeout(() => send(pendingType), 3000);
        return () => clearTimeout(timer);
    }, [online, pendingType, sosActive, isProcessing, send]);

    const openConfirm = () => {
        if (sosActive || isProcessing) return;
        setMessage(null);
        setEmergencyType('general_emergency');
        setCountdown(COUNTDOWN_SECONDS);
        setPhase('confirm');
    };

    const cancelConfirm = useCallback(() => {
        setPhase('idle');
        setCountdown(null);
    }, []);

    const closeEndDialog = useCallback(() => setPhase('idle'), []);

    const endSOS = async () => {
        try {
            const ended = await deactivateSOS();
            if (ended) setPhase('idle');
        } catch (err) {
            setPhase('idle');
            setMessage(err.message);
            toast.error(err.message);
        }
    };

    if (phase === 'confirm') {
        return (
            <SOSDialog title="Send emergency SOS?" onCancel={cancelConfirm} initialFocusRef={sendNowRef}>
                <p className="mb-2 text-center text-gray-700" aria-live="assertive">
                    Sending automatically in{' '}
                    <span className="text-3xl font-bold text-red-600">{countdown}</span> s
                </p>
                <fieldset className="mb-4">
                    <legend className="mb-2 text-sm font-semibold text-gray-800">Type of emergency (optional)</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {EMERGENCY_TYPES.map((t) => (
                            <label
                                key={t.value}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${emergencyType === t.value ? 'border-red-500 bg-red-50 font-semibold text-red-800' : 'border-gray-300 text-gray-700'}`}
                            >
                                <input
                                    type="radio"
                                    name="sos-emergency-type"
                                    value={t.value}
                                    checked={emergencyType === t.value}
                                    onChange={() => setEmergencyType(t.value)}
                                    className="accent-red-600"
                                />
                                {t.label}
                            </label>
                        ))}
                    </div>
                </fieldset>
                <ul className="mb-4 space-y-1 text-sm text-gray-700">
                    <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />Your live location is shared with emergency responders until you end the SOS.</li>
                    <li className="flex gap-2"><Camera className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />Your <strong>camera and microphone will be recorded</strong> and shared with responders.</li>
                    <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />Nearby verified volunteers may be alerted.</li>
                </ul>
                {!online && (
                    <p role="alert" className="mb-3 rounded-lg bg-yellow-100 p-2 text-sm font-semibold text-yellow-900">
                        You are offline - call 112 now. Your SOS will be sent when you reconnect.
                    </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        ref={sendNowRef}
                        type="button"
                        onClick={() => send(emergencyType)}
                        disabled={isProcessing}
                        className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Send SOS now
                    </button>
                    <button
                        type="button"
                        onClick={cancelConfirm}
                        className="flex-1 rounded-xl bg-gray-200 px-4 py-3 font-bold text-gray-800 hover:bg-gray-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400"
                    >
                        Cancel
                    </button>
                </div>
                <Call112 className="mt-3" />
            </SOSDialog>
        );
    }

    if (sosActive) {
        return (
            <>
                <section
                    aria-label="Active SOS"
                    aria-live="polite"
                    className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 sm:w-80 rounded-2xl border-4 border-red-500 bg-red-600 p-3 text-white shadow-2xl"
                >
                    <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
                        <span className="h-3 w-3 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                        SOS active
                    </h2>
                    <ul className="mb-3 space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {lastLocation ? 'Sharing your live location' : 'Waiting for your location...'}
                        </li>
                        <li className="flex items-center gap-2">
                            <Camera className="h-4 w-4" aria-hidden="true" />
                            {cameraActive ? 'Camera and microphone recording' : 'Camera is not being shared'}
                        </li>
                        {!online && (
                            <li className="flex items-center gap-2 font-semibold text-yellow-200">
                                <WifiOff className="h-4 w-4" aria-hidden="true" />
                                Offline - call 112 if you can
                            </li>
                        )}
                    </ul>
                    {message && <p role="alert" className="mb-2 rounded-lg bg-white/15 p-2 text-sm">{message}</p>}
                    <div className="flex gap-2">
                        <a
                            href="tel:112"
                            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-800 px-3 py-2 font-bold hover:bg-red-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
                        >
                            <Phone className="h-4 w-4" aria-hidden="true" /> Call 112
                        </a>
                        <button
                            type="button"
                            onClick={() => setPhase('end')}
                            disabled={isProcessing}
                            className="flex-1 rounded-xl bg-white px-3 py-2 font-bold text-red-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-white disabled:opacity-60"
                        >
                            {isProcessing ? 'Ending...' : "I'm safe"}
                        </button>
                    </div>
                </section>
                {phase === 'end' && (
                    <SOSDialog title="End your SOS?" onCancel={closeEndDialog} initialFocusRef={keepActiveRef} tone="neutral">
                        <p className="mb-4 text-center text-gray-700">
                            Responders will stop tracking your location and the camera will stop recording.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                ref={keepActiveRef}
                                type="button"
                                onClick={closeEndDialog}
                                className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
                            >
                                Keep SOS active
                            </button>
                            <button
                                type="button"
                                onClick={endSOS}
                                disabled={isProcessing}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-200 px-4 py-3 font-bold text-gray-800 hover:bg-gray-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-gray-400 disabled:opacity-60"
                            >
                                {isProcessing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                Yes, I&apos;m safe
                            </button>
                        </div>
                    </SOSDialog>
                )}
            </>
        );
    }

    const showHelp = message || !online || pendingType;

    return (
        <>
            {showHelp && (
                <div
                    role="alert"
                    className="fixed bottom-24 right-4 left-4 sm:left-auto z-50 sm:w-80 rounded-2xl border-2 border-red-500 bg-white p-3 shadow-2xl"
                >
                    <div className="mb-2 flex items-start gap-2">
                        {online ? (
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                        ) : (
                            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                        )}
                        <p className="flex-1 text-sm font-semibold text-gray-800">
                            {message || (online ? 'Sending your SOS...' : 'You are offline. In an emergency, call 112.')}
                        </p>
                        {message && !pendingType && (
                            <button
                                type="button"
                                onClick={() => setMessage(null)}
                                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                                aria-label="Dismiss message"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                    {pendingType && (
                        <p className="mb-2 text-xs text-gray-600">Your SOS will be sent automatically when you are back online.</p>
                    )}
                    <Call112 />
                </div>
            )}
            <button
                type="button"
                onClick={openConfirm}
                disabled={isProcessing}
                className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 text-lg font-extrabold text-white shadow-2xl transition-transform hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 disabled:opacity-60"
                aria-label={isProcessing ? 'Sending SOS' : 'Emergency SOS'}
            >
                {isProcessing ? <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" /> : 'SOS'}
            </button>
        </>
    );
};

export default EmergencyButton;
