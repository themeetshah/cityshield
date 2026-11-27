import { useEffect, useRef, useState } from 'react';
import { getLocationTrail, getSOSById } from '../../services/sos';
import { errorMessage } from '../../services/api';

const POLL_MS = 5000;
const TRAIL_POINTS = 200;

const humanType = (type) => (type || 'emergency').replace(/_/g, ' ');

/**
 * Follow an SOS alert live: polls its latest position (updated by the person in
 * distress every ~10 s) while the tab is visible, plus the movement trail for
 * department responders. `initial` ({latitude, longitude}) is shown until the
 * first fetch returns, or if the viewer may not read the live position.
 *
 * @returns {{ target, active, updatedAt, error, trail, loading }}
 */
const useSosTracking = (sosId, { initial = null, withTrail = false } = {}) => {
    const [state, setState] = useState(() => ({
        target: initial && sosId
            ? { latitude: initial.latitude, longitude: initial.longitude, name: `SOS #${sosId}`, kind: 'sos', key: `sos-${sosId}` }
            : null,
        active: true,
        updatedAt: null,
        error: null,
        trail: [],
        loading: !!sosId,
    }));
    const trailAllowed = useRef(withTrail);

    useEffect(() => {
        if (!sosId) return undefined;
        let cancelled = false;
        let timer = null;

        const tick = async () => {
            if (document.hidden) {
                timer = setTimeout(tick, POLL_MS);
                return;
            }
            try {
                const sos = await getSOSById(sosId);
                let trail = null;
                if (trailAllowed.current) {
                    try {
                        const { results } = await getLocationTrail(sosId);
                        trail = [...results]
                            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                            .slice(-TRAIL_POINTS)
                            .map((p) => [p.latitude, p.longitude]);
                    } catch {
                        trailAllowed.current = false; // not a responder for this SOS
                    }
                }
                if (cancelled) return;
                setState((prev) => ({
                    target: {
                        latitude: sos.latitude,
                        longitude: sos.longitude,
                        name: `SOS #${sos.id} · ${humanType(sos.emergency_type)}`,
                        kind: 'sos',
                        key: `sos-${sos.id}`,
                    },
                    active: sos.is_active,
                    updatedAt: new Date(),
                    error: null,
                    trail: trail ?? prev.trail,
                    loading: false,
                }));
                if (!sos.is_active) return; // stop polling once resolved
            } catch (err) {
                if (cancelled) return;
                const status = err?.response?.status;
                setState((prev) => ({
                    ...prev,
                    loading: false,
                    error: status === 403 || status === 404
                        ? 'Live tracking is available to responders and volunteers linked to this SOS. Showing the last known position.'
                        : errorMessage(err, 'Could not refresh the SOS position.'),
                }));
                if (status === 403 || status === 404) return; // retrying won't help
            }
            timer = setTimeout(tick, POLL_MS);
        };

        tick();
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [sosId]);

    return state;
};

export default useSosTracking;
