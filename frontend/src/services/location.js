// Thin re-exports so older imports keep working; the canonical helpers live in
// components/map/geo.js and hooks/useGeolocation.js.
export { distanceMeters, formatDistance } from '../components/map/geo';
export { getCurrentPosition as getCurrentLocation } from '../hooks/useGeolocation';
