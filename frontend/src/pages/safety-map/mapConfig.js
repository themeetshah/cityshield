import L from 'leaflet';

export const REPORTS_RADIUS_M = 3000;
export const FACILITIES_RADIUS_M = 5000;
export const RISK_RADIUS_M = 3000;
export const ANALYSIS_RADIUS_M = 1000;
/** Data is refetched only after moving this far. */
export const REFETCH_DISTANCE_M = 250;
/** The route is recomputed only after moving this far. */
export const REROUTE_DISTANCE_M = 75;

export const facilityKey = (facility) => `${facility.type}-${facility.id}`;

const MARKERS = {
    user: { emoji: '📍', from: '#047857', to: '#059669' },
    manual: { emoji: '📌', from: '#7c3aed', to: '#6d28d9' },
    hospital: { emoji: '🏥', from: '#3b82f6', to: '#1d4ed8' },
    police: { emoji: '🚓', from: '#059669', to: '#047857' },
    sos: { emoji: '🆘', from: '#dc2626', to: '#991b1b' },
    crime: { emoji: '🚨', from: '#ea580c', to: '#c2410c' },
    harassment: { emoji: '⚠️', from: '#e11d48', to: '#be123c' },
    safety: { emoji: '⚡', from: '#f59e0b', to: '#d97706' },
    infrastructure: { emoji: '🔧', from: '#6366f1', to: '#4f46e5' },
    fire_hazard: { emoji: '🔥', from: '#f97316', to: '#c2410c' },
    medical: { emoji: '🚑', from: '#0ea5e9', to: '#0369a1' },
    incident: { emoji: '📍', from: '#f59e0b', to: '#d97706' },
    other: { emoji: '❔', from: '#64748b', to: '#475569' },
};

const iconCache = new Map();

export const markerIcon = (type, size = 32) => {
    const key = `${type}-${size}`;
    if (iconCache.has(key)) return iconCache.get(key);
    const cfg = MARKERS[type] || MARKERS.other;
    const icon = L.divIcon({
        html: `<div class="cs-marker" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px;background:linear-gradient(135deg, ${cfg.from}, ${cfg.to});">${cfg.emoji}</div>`,
        className: 'cs-marker-wrapper',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
    });
    iconCache.set(key, icon);
    return icon;
};

export const RISK_LEVELS = [
    { level: 'critical', label: 'Critical', color: '#991b1b' },
    { level: 'high', label: 'High', color: '#dc2626' },
    { level: 'moderate', label: 'Moderate', color: '#f59e0b' },
    { level: 'low', label: 'Low', color: '#facc15' },
];

export const riskColor = (level) => (RISK_LEVELS.find((l) => l.level === level) || RISK_LEVELS[3]).color;

export const RISK_LEVEL_LABELS = {
    critical: 'Critical',
    high: 'High',
    moderate: 'Moderate',
    low: 'Low',
    no_data: 'No reported incidents',
};

export const TYPE_LABELS = {
    crime: 'Crime',
    harassment: 'Harassment',
    safety: 'Safety concern',
    infrastructure: 'Infrastructure',
    fire_hazard: 'Fire hazard',
    medical: 'Medical',
    other: 'Other',
    sos: 'SOS (resolved)',
};
