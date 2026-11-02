import {
    Activity, AlertTriangle, CheckCircle, Clock, Construction, Flame, HeartPulse, HelpCircle, Shield, X,
} from 'lucide-react';

export const REPORT_TYPE_OPTIONS = [
    { value: 'crime', label: 'Crime', icon: Shield, gradient: 'from-red-600 to-red-700', badge: 'bg-red-100 text-red-800 border-red-200', iconBg: 'bg-red-500', description: 'Theft, violence or other criminal activity' },
    { value: 'harassment', label: 'Harassment', icon: AlertTriangle, gradient: 'from-rose-500 to-red-600', badge: 'bg-rose-100 text-rose-800 border-rose-200', iconBg: 'bg-rose-500', description: 'Verbal, physical or online harassment' },
    { value: 'safety', label: 'Safety Concern', icon: AlertTriangle, gradient: 'from-yellow-500 to-orange-500', badge: 'bg-orange-100 text-orange-800 border-orange-200', iconBg: 'bg-orange-500', description: 'Unsafe conditions or areas' },
    { value: 'infrastructure', label: 'Infrastructure Issue', icon: Construction, gradient: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-800 border-blue-200', iconBg: 'bg-blue-500', description: 'Roads, street lights, water or electricity' },
    { value: 'fire_hazard', label: 'Fire Hazard', icon: Flame, gradient: 'from-orange-500 to-red-600', badge: 'bg-amber-100 text-amber-800 border-amber-200', iconBg: 'bg-amber-600', description: 'Fire risks, smoke, gas leaks, blocked exits' },
    { value: 'medical', label: 'Medical Emergency', icon: HeartPulse, gradient: 'from-sky-500 to-cyan-600', badge: 'bg-sky-100 text-sky-800 border-sky-200', iconBg: 'bg-sky-500', description: 'Someone needs medical help (call 112 if urgent)' },
    { value: 'other', label: 'Other', icon: HelpCircle, gradient: 'from-purple-500 to-indigo-600', badge: 'bg-purple-100 text-purple-800 border-purple-200', iconBg: 'bg-purple-500', description: 'Any other community concern' },
];

const TYPE_BY_VALUE = Object.fromEntries(REPORT_TYPE_OPTIONS.map((t) => [t.value, t]));
export const getTypeConfig = (type) => TYPE_BY_VALUE[type] || TYPE_BY_VALUE.other;

export const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending', icon: Clock, badge: 'bg-amber-100 text-amber-800 border-amber-200', gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 via-orange-50 to-yellow-50' },
    { value: 'investigating', label: 'Investigating', icon: Activity, badge: 'bg-blue-100 text-blue-800 border-blue-200', gradient: 'from-blue-500 to-indigo-600', bg: 'from-blue-50 via-indigo-50 to-cyan-50' },
    { value: 'resolved', label: 'Resolved', icon: CheckCircle, badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', gradient: 'from-emerald-500 to-green-600', bg: 'from-emerald-50 via-green-50 to-teal-50' },
    { value: 'dismissed', label: 'Dismissed', icon: X, badge: 'bg-red-100 text-red-800 border-red-200', gradient: 'from-red-500 to-rose-600', bg: 'from-red-50 via-rose-50 to-pink-50' },
];

const STATUS_BY_VALUE = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]));
export const getStatusConfig = (status) => STATUS_BY_VALUE[status] || STATUS_BY_VALUE.pending;

export const DEPARTMENT_LABELS = {
    police: 'Police',
    municipal: 'Municipal Corporation',
    fire: 'Fire & Rescue',
    medical: 'Medical / EMS',
};

const UNITS = [
    ['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60],
];

export const timeAgo = (dateString, now = Date.now()) => {
    const seconds = Math.floor((now - new Date(dateString).getTime()) / 1000);
    for (const [unit, size] of UNITS) {
        const count = Math.floor(seconds / size);
        if (count >= 1) return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
    }
    return 'Just now';
};

export const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
});

export const formatDateTime = (dateString) => new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'webm', 'mov'];
export const fileExtension = (path = '') => path.split('?')[0].split('.').pop().toLowerCase();
export const isVideoPath = (path) => VIDEO_EXTENSIONS.includes(fileExtension(path));

// Client-side checks mirror the server (the server is authoritative).
export const MAX_MEDIA_FILES = 5;
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const ACCEPTED_MEDIA = {
    'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/gif': 'image',
    'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video',
};
export const MEDIA_ACCEPT_ATTR = Object.keys(ACCEPTED_MEDIA).join(',');
export const TITLE_LIMITS = { min: 3, max: 200 };
export const DESCRIPTION_LIMITS = { min: 10, max: 5000 };

export const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};
