const EARTH_RADIUS_M = 6371000;
const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two {latitude, longitude} points. */
export const distanceMeters = (a, b) => {
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const formatDistance = (meters) => {
    if (meters == null || Number.isNaN(meters)) return '';
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
};

export const formatDuration = (seconds) => {
    if (seconds == null) return '';
    const minutes = Math.max(1, Math.round(seconds / 60));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

export const isValidPoint = (p) => !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude);
