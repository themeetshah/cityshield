import { distanceMeters, isValidPoint } from '../../components/map/geo';

// Small formatting helpers shared by the community, dashboard and profile pages.

export const timeAgo = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    const time = date.getTime();
    if (Number.isNaN(time)) return '';
    const minutes = Math.floor((Date.now() - time) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
};

export const formatDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

/** "medical_emergency" -> "Medical emergency" */
export const humanize = (value) => {
    if (!value) return '';
    const text = String(value).replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Distance in metres -> "350 m" / "2.4 km"; '' when unknown. */
export const formatDistance = (metres) => {
    if (metres === null || metres === undefined || Number.isNaN(Number(metres))) return '';
    const m = Number(metres);
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
};

/** Great-circle distance in metres between two {latitude, longitude} points, or null. */
export const distanceBetween = (a, b) => {
    if (!a || !b) return null;
    const p = { latitude: Number(a.latitude), longitude: Number(a.longitude) };
    const q = { latitude: Number(b.latitude), longitude: Number(b.longitude) };
    return isValidPoint(p) && isValidPoint(q) ? distanceMeters(p, q) : null;
};

export const truncate =(text, max = 120) => {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

export const REPORT_STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-800',
    investigating: 'bg-blue-100 text-blue-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    dismissed: 'bg-gray-200 text-gray-700',
};

export const reportStatusClass = (status) => REPORT_STATUS_STYLES[status] || 'bg-gray-100 text-gray-700';

/** "Asha Rao" -> "AR", "asha" -> "A", falls back to the e-mail's first letter. */
export const initialsOf = (name, email) => {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (email || '?')[0].toUpperCase();
};
