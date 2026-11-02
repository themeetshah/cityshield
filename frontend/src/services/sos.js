import api from './api';

/**
 * SOS API client. Every function throws on failure (axios error) - callers
 * show `errorMessage(err)` from services/api.
 *
 * Owner calls (the person who raised the SOS) send the secret `X-SOS-Token`
 * returned at creation and use `allowAnonymous` so an expired login never
 * blocks an emergency.
 */

const ownerConfig = (sosToken, extra = {}) => ({
    allowAnonymous: true,
    ...extra,
    headers: { ...(extra.headers || {}), ...(sosToken ? { 'X-SOS-Token': sosToken } : {}) },
});

// ---------------------------------------------------------------- owner side

/** → { sos_id, sos_token|null, already_active, status, emergency_type, department, created_at,
 *      emergency_services_notified, staff_notified, volunteers_alerted, message } */
export const createSOS = async ({ latitude, longitude, accuracy = null, emergencyType = 'general_emergency', description = '' }) => {
    const { data } = await api.post(
        '/sos/emergency/',
        { latitude, longitude, accuracy, emergency_type: emergencyType, description },
        { allowAnonymous: true }
    );
    return data;
};

/** Detail of one SOS (owner via token, responders, alerted volunteers). */
export const getSOSById = async (sosId, { sosToken } = {}) => {
    const { data } = await api.get(`/sos/emergency/${sosId}/`, ownerConfig(sosToken));
    return data;
};

/** → { success, ignored, update_id? } */
export const sendLocationUpdate = async (sosId, sosToken, { latitude, longitude, accuracy = null }) => {
    const { data } = await api.post(
        `/sos/emergency/${sosId}/location-updates/`,
        { latitude, longitude, accuracy },
        ownerConfig(sosToken)
    );
    return data;
};

const extensionFor = (mimeType = '') => {
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('quicktime')) return 'mov';
    return 'webm';
};

/** Upload one self-contained video segment. → { success, duplicate, feed_id, chunk_sequence } */
export const uploadVideoChunk = async (sosId, sosToken, blob, { chunkNumber, duration = null } = {}) => {
    const type = (blob.type || 'video/webm').split(';')[0];
    const file = new File([blob], `segment-${chunkNumber}.${extensionFor(type)}`, { type });
    const form = new FormData();
    form.append('video', file);
    form.append('chunk_number', String(chunkNumber));
    if (duration) form.append('duration', String(duration));
    const { data } = await api.post(`/sos/emergency/${sosId}/video/`, form, ownerConfig(sosToken, { timeout: 60000 }));
    return data;
};

/** Owner (token), responders of the SOS department, superadmin. → { success, message } */
export const resolveSOS = async (sosId, { sosToken } = {}) => {
    const { data } = await api.post(`/sos/resolve/${sosId}/`, null, ownerConfig(sosToken));
    return data;
};

/** Public facility lookup. → { nearest_location|null, all_locations, search_radius } */
export const findNearestSafeLocation = async ({ latitude, longitude, radius = 10000 }) => {
    const { data } = await api.post(
        '/sos/nearest-safe-location/',
        { latitude, longitude, radius },
        { allowAnonymous: true }
    );
    return data;
};

// ---------------------------------------------------------------- responders / volunteers

/**
 * → { alerts: [{ id, latitude, longitude, emergency_type, department, description, created_at,
 *      is_active, distance, responders_count, user_name, has_responded }], active_count, user_role }
 * Volunteers must pass latitude/longitude; citizens get 403.
 */
export const getSOSByRole = async ({ latitude, longitude, radius, status } = {}) => {
    const params = {};
    if (latitude != null && longitude != null) {
        params.latitude = latitude;
        params.longitude = longitude;
    }
    if (radius != null) params.radius = radius;
    if (status) params.status = status;
    const { data } = await api.get('/sos/by-role/', { params });
    return data;
};

/** Responders: paginated lists. → { count, limit, offset, results } */
export const getActiveSOS = async ({ limit, offset } = {}) => {
    const { data } = await api.get('/sos/active/', { params: { limit, offset } });
    return data;
};

export const getAllSOS = async ({ limit, offset } = {}) => {
    const { data } = await api.get('/sos/all/', { params: { limit, offset } });
    return data;
};

/** → { success, message } */
export const respondToSOS = async (sosId, { message, latitude, longitude } = {}) => {
    const body = { sos_id: sosId };
    if (message) body.message = message;
    if (latitude != null && longitude != null) {
        body.latitude = latitude;
        body.longitude = longitude;
    }
    const { data } = await api.post('/sos/respond/', body);
    return data;
};

/** Responders: location trail. → { results: [{ id, latitude, longitude, accuracy, timestamp }] } */
export const getLocationTrail = async (sosId) => {
    const { data } = await api.get(`/sos/emergency/${sosId}/location-updates/`);
    return data;
};

/**
 * Responders: → { sos_id, emergency_info, video_feeds: [{ id, video_url (signed, ~15 min), content_type,
 *   timestamp, chunk_sequence, file_size, duration, viewed }], total_chunks, url_expires_in }
 */
export const getEmergencyVideoFeeds = async (sosId) => {
    const { data } = await api.get(`/sos/emergency/${sosId}/video-feeds/`);
    return data;
};

/** Responders: active SOS alerts with video. → { results: [...] } */
export const getPoliceVideoFeeds = async () => {
    const { data } = await api.get('/sos/police/video-feeds/');
    return data;
};

export const markVideoViewed = async (feedId, viewingDuration = 0) => {
    const { data } = await api.post(`/sos/videos/${feedId}/viewed/`, { viewing_duration: Math.round(viewingDuration) });
    return data;
};

/** → { is_volunteer, is_available, is_verified, response_count } */
export const getVolunteerStatus = async () => {
    const { data } = await api.get('/sos/volunteer/status/');
    return data;
};

/** Location is required when becoming available. → { success, is_available } */
export const setVolunteerAvailability = async (isAvailable, coords = null) => {
    const body = { is_available: Boolean(isAvailable) };
    if (coords) {
        body.latitude = coords.latitude;
        body.longitude = coords.longitude;
    }
    const { data } = await api.post('/sos/volunteer-availability/', body);
    return data;
};

/** → { results: [{ id, sos_id, emergency_type, status, responded, alerted_at, response_time, sos_is_active, distance }] } */
export const getMyResponses = async () => {
    const { data } = await api.get('/sos/volunteer/responses/');
    return data;
};

export const EMERGENCY_TYPES = [
    { value: 'general_emergency', label: 'General emergency' },
    { value: 'medical', label: 'Medical' },
    { value: 'fire', label: 'Fire' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'accident', label: 'Accident' },
    { value: 'other', label: 'Other' },
];

const sosService = {
    createSOS,
    getSOSById,
    sendLocationUpdate,
    uploadVideoChunk,
    resolveSOS,
    findNearestSafeLocation,
    getSOSByRole,
    getActiveSOS,
    getAllSOS,
    respondToSOS,
    getLocationTrail,
    getEmergencyVideoFeeds,
    getPoliceVideoFeeds,
    markVideoViewed,
    getVolunteerStatus,
    setVolunteerAvailability,
    getMyResponses,
};

export default sosService;
