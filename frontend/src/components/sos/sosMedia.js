/**
 * Camera/microphone capture for an active SOS.
 *
 * SegmentRecorder records continuously in self-contained ~10 s segments: each
 * segment uses its own MediaRecorder (stop -> restart), so every uploaded file
 * has its own header and is playable on its own. Recording never waits for
 * uploads; finished segments are handed to `onSegment`.
 *
 * UploadQueue uploads segments in order in the background with retry +
 * exponential backoff, waits while offline, and drops items the server
 * permanently rejects (4xx).
 */

const SEGMENT_MS = 10000;
const MIME_CANDIDATES = [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
    'video/mp4',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const pickMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return null;
    if (!MediaRecorder.isTypeSupported) return '';
    return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

/** Ask for camera + microphone; fall back to camera only. Throws a readable Error. */
export const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser cannot access the camera.');
    }
    const video = { width: { ideal: 1280 }, height: { ideal: 720 } };
    try {
        return await navigator.mediaDevices.getUserMedia({ video, audio: true });
    } catch (err) {
        if (err?.name === 'NotAllowedError') throw new Error('Camera/microphone permission was denied.', { cause: err });
        return navigator.mediaDevices.getUserMedia({ video, audio: false });
    }
};

export class SegmentRecorder {
    constructor(stream, onSegment) {
        this.stream = stream;
        this.onSegment = onSegment;
        this.mimeType = pickMimeType();
        this.running = false;
        this.recorder = null;
        this.timer = null;
        this.failures = 0;
    }

    get supported() {
        return this.mimeType !== null;
    }

    start() {
        if (!this.supported || this.running) return;
        this.running = true;
        this.recordSegment();
    }

    recordSegment() {
        if (!this.running) return;
        const tracksLive = this.stream.getTracks().some((t) => t.readyState === 'live');
        if (!tracksLive) {
            this.running = false;
            return;
        }
        let recorder;
        try {
            recorder = new MediaRecorder(this.stream, this.mimeType ? { mimeType: this.mimeType } : undefined);
        } catch (err) {
            this.retryLater(err);
            return;
        }
        const parts = [];
        const startedAt = Date.now();
        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) parts.push(event.data);
        };
        recorder.onstop = () => {
            clearTimeout(this.timer);
            if (parts.length) {
                const type = (recorder.mimeType || this.mimeType || 'video/webm').split(';')[0];
                const blob = new Blob(parts, { type });
                if (blob.size > 0) this.onSegment(blob, (Date.now() - startedAt) / 1000);
            }
            // Start the next segment immediately - empty segments never stop recording.
            if (this.running) this.recordSegment();
        };
        recorder.onerror = (event) => this.retryLater(event?.error);
        try {
            recorder.start();
        } catch (err) {
            this.retryLater(err);
            return;
        }
        this.recorder = recorder;
        this.failures = 0;
        this.timer = setTimeout(() => {
            if (recorder.state !== 'inactive') recorder.stop();
        }, SEGMENT_MS);
    }

    retryLater(err) {
        this.failures += 1;
        if (this.failures === 1) console.error('SOS video recording error', err?.name || err);
        if (this.failures > 5) {
            this.running = false;
            return;
        }
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.recordSegment(), 2000);
    }

    /** Stop recording; the current partial segment is still delivered via onSegment. */
    stop() {
        this.running = false;
        clearTimeout(this.timer);
        if (this.recorder && this.recorder.state !== 'inactive') {
            try {
                this.recorder.stop();
            } catch {
                // already stopped
            }
        }
        this.recorder = null;
    }
}

const waitForOnline = (maxMs) =>
    new Promise((resolve) => {
        const done = () => {
            window.removeEventListener('online', done);
            clearTimeout(timer);
            resolve();
        };
        const timer = setTimeout(done, maxMs);
        window.addEventListener('online', done);
    });

export class UploadQueue {
    /**
     * @param {(item) => Promise} upload
     * @param {{ onPermanentFailure?: (item, error) => void }} hooks
     */
    constructor(upload, { onPermanentFailure } = {}) {
        this.upload = upload;
        this.onPermanentFailure = onPermanentFailure;
        this.items = [];
        this.running = false;
        this.closed = false;
    }

    push(item) {
        if (this.closed) return;
        this.items.push({ ...item, attempts: 0 });
        this.run();
    }

    get pending() {
        return this.items.length;
    }

    async run() {
        if (this.running) return;
        this.running = true;
        while (this.items.length && !this.closed) {
            const item = this.items[0];
            if (!navigator.onLine) {
                await waitForOnline(15000);
                continue;
            }
            try {
                await this.upload(item);
                this.items.shift();
            } catch (err) {
                const status = err?.response?.status;
                const permanent = status >= 400 && status < 500 && status !== 408 && status !== 429;
                if (permanent) {
                    this.items.shift();
                    this.onPermanentFailure?.(item, err);
                    continue;
                }
                item.attempts += 1;
                await sleep(Math.min(30000, 1000 * 2 ** Math.min(item.attempts, 5)));
            }
        }
        this.running = false;
    }

    /** Resolve once everything is uploaded, or after `timeoutMs`. */
    async drain(timeoutMs) {
        const deadline = Date.now() + timeoutMs;
        while (this.items.length && !this.closed && Date.now() < deadline) {
            await sleep(250);
        }
    }

    close() {
        this.closed = true;
        this.items = [];
    }
}
