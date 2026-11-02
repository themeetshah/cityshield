import { useEffect, useRef, useState } from 'react';
import { EyeOff, Video } from 'lucide-react';

/** Small self-view while the SOS camera feed is being recorded and shared with responders. */
const CameraPreview = ({ stream }) => {
    const videoRef = useRef(null);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        const el = videoRef.current;
        if (!el || !stream) return undefined;
        el.srcObject = stream;
        el.play().catch(() => {});
        return () => {
            el.srcObject = null;
        };
    }, [stream, hidden]);

    if (!stream) return null;

    if (hidden) {
        return (
            <button
                type="button"
                onClick={() => setHidden(false)}
                className="fixed top-20 right-4 z-[60] flex items-center gap-2 rounded-full bg-red-600 px-3 py-2 text-xs font-bold text-white shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300"
                aria-label="Show camera preview (recording continues)"
            >
                <span className="h-2 w-2 rounded-full bg-white motion-safe:animate-pulse" aria-hidden="true" />
                REC
            </button>
        );
    }

    return (
        <section
            aria-label="SOS camera recording"
            className="fixed top-20 right-4 z-[60] w-40 sm:w-52 overflow-hidden rounded-xl border-2 border-red-500 bg-black shadow-2xl"
        >
            <video ref={videoRef} playsInline muted autoPlay className="aspect-[4/3] w-full object-cover" />
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
                <span className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse" aria-hidden="true" />
                REC
            </div>
            <button
                type="button"
                onClick={() => setHidden(true)}
                className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-gray-800 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                aria-label="Hide camera preview (recording continues)"
            >
                <EyeOff className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="flex items-center gap-1 bg-black/80 px-2 py-1 text-[11px] text-white">
                <Video className="h-3 w-3" aria-hidden="true" />
                Shared with responders
            </p>
        </section>
    );
};

export default CameraPreview;
