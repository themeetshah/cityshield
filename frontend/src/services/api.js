import axios from 'axios';
import { tokens, emitSessionExpired } from './tokens';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
});

api.interceptors.request.use((config) => {
    const access = tokens.getAccess();
    if (access && !config.skipAuth) {
        config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
});

// ---- refresh-on-401 (single flight) ---------------------------------------
let refreshPromise = null;

const refreshAccessToken = async () => {
    const refresh = tokens.getRefresh();
    if (!refresh) throw new Error('No refresh token');
    if (!refreshPromise) {
        refreshPromise = axios
            .post(`${API_BASE_URL}/token/refresh/`, { refresh })
            .then(({ data }) => {
                tokens.set({ access: data.access, refresh: data.refresh });
                return data.access;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const status = error.response?.status;
        if (status !== 401 || !original || original._retried || original.skipAuth) {
            return Promise.reject(error);
        }
        original._retried = true;

        try {
            const access = await refreshAccessToken();
            original.headers = { ...original.headers, Authorization: `Bearer ${access}` };
            return api(original);
        } catch {
            tokens.clear();
            emitSessionExpired();
            // Endpoints that also work anonymously (e.g. SOS) are retried
            // without credentials instead of failing - never block an emergency.
            if (original.allowAnonymous) {
                const retry = { ...original, skipAuth: true, headers: { ...original.headers } };
                delete retry.headers.Authorization;
                return api(retry);
            }
            return Promise.reject(error);
        }
    }
);

/** Extract a human-readable message from an axios error. */
export const errorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    const data = error?.response?.data;
    if (!data) return error?.message === 'Network Error' ? 'Network error - check your connection.' : fallback;
    if (typeof data === 'string') return fallback;
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    const first = Object.entries(data)[0];
    if (first) {
        const [field, msg] = first;
        const text = Array.isArray(msg) ? msg[0] : String(msg);
        return field === 'non_field_errors' ? text : `${field.replace(/_/g, ' ')}: ${text}`;
    }
    return fallback;
};

/** Absolute URL for a media path returned by the API. */
export const mediaUrl = (path) => {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    const origin = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default api;
