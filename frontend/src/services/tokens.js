// Token storage in one place. Access + refresh tokens are kept in
// localStorage so a reload keeps the session; the user object/role is NEVER
// trusted from storage - AuthContext re-fetches /users/me/ on boot.

const ACCESS_KEY = 'cs_access';
const REFRESH_KEY = 'cs_refresh';

const safe = (fn, fallback = null) => {
    try {
        return fn();
    } catch {
        return fallback;
    }
};

export const tokens = {
    getAccess: () => safe(() => localStorage.getItem(ACCESS_KEY)),
    getRefresh: () => safe(() => localStorage.getItem(REFRESH_KEY)),
    set: ({ access, refresh }) =>
        safe(() => {
            if (access) localStorage.setItem(ACCESS_KEY, access);
            if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
        }),
    clear: () =>
        safe(() => {
            localStorage.removeItem(ACCESS_KEY);
            localStorage.removeItem(REFRESH_KEY);
            // legacy keys from v1
            ['token', 'user', 'loginTimestamp', 'access', 'refresh'].forEach((k) => localStorage.removeItem(k));
        }),
};

// Simple pub/sub so api.js can tell AuthContext the session ended without a
// hard page redirect (which would kill an in-progress SOS).
const listeners = new Set();
export const onSessionExpired = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
export const emitSessionExpired = () => listeners.forEach((fn) => fn());
