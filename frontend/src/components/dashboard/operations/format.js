// Shared constants and formatting helpers for the operations dashboard.

export const PAGE_SIZE = 25;
export const POLL_MS = 30000;

export const REPORT_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' },
];

export const REPORT_TYPES = [
    { value: 'crime', label: 'Crime' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'safety', label: 'Safety concern' },
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'fire_hazard', label: 'Fire hazard' },
    { value: 'medical', label: 'Medical' },
    { value: 'other', label: 'Other' },
];

export const STATUS_STYLES = {
    pending: 'bg-amber-100 text-amber-800',
    investigating: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    dismissed: 'bg-slate-200 text-slate-700',
};

export const ALERT_TYPES = [
    { value: 'safety', label: 'Safety Advisory' },
    { value: 'traffic', label: 'Traffic Update' },
    { value: 'emergency', label: 'Emergency Notice' },
    { value: 'community', label: 'Community Notice' },
];

export const DISPATCH_STEPS = {
    assigned: 'Team assigned',
    dispatched: 'Dispatched',
    arrived: 'Arrived on scene',
    resolved: 'Resolved',
};

export const NEXT_STEP_LABEL = {
    dispatched: 'Mark dispatched',
    arrived: 'Mark arrived',
    resolved: 'Mark dispatch resolved',
};

export const RADIUS_OPTIONS_M = [2000, 5000, 10000, 20000, 50000];

/** Cap staggered entrance animations so long lists don't trickle in for seconds. */
export const staggerDelay = (index) => Math.min(index, 6) * 0.04;

export const humanize = (value) =>
    (value || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const timeAgo = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
};

export const formatDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '');

export const formatDistance = (metres) => {
    if (metres === null || metres === undefined) return null;
    return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
};

export const formatKm = (metres) => `${metres / 1000} km`;

/** "—" for null/undefined so missing metrics are never shown as fake numbers. */
export const orDash = (value, suffix = '') => (value === null || value === undefined ? '—' : `${value}${suffix}`);

export const mapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export const inputClass =
    'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
