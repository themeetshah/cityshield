/** Google-Maps-like route for live SOS tracking: white casing under a bold blue line. */
export const TRACK_ROUTE_STYLES = [
    { color: '#ffffff', weight: 11, opacity: 1 },
    { color: '#1a73e8', weight: 7, opacity: 1 },
];
export const TRACK_ROUTE_COLOR = '#1a73e8';

const SAFE_PLACES_PER_TYPE = 3;

/** Up to 3 nearest hospitals + 3 nearest police stations (distances are from the SOS). */
export const pickSafePlaces = (hospitals, policeStations) => [
    ...hospitals.slice(0, SAFE_PLACES_PER_TYPE),
    ...policeStations.slice(0, SAFE_PLACES_PER_TYPE),
].sort((a, b) => a.distance - b.distance);
