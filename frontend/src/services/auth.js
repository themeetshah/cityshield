import api from './api';
import { tokens } from './tokens';

const storeSession = (data) => {
    tokens.set({ access: data.access || data.token, refresh: data.refresh });
    return data;
};

export const authService = {
    register: async ({ email, password, name }) => {
        const { data } = await api.post('/users/register/', { email, password, name }, { skipAuth: true });
        return storeSession(data);
    },

    login: async ({ email, password }) => {
        const { data } = await api.post('/users/login/', { email, password }, { skipAuth: true });
        return storeSession(data);
    },

    /** `credential` is the raw Google ID token from @react-oauth/google - verified by the server. */
    googleAuth: async (credential) => {
        const { data } = await api.post('/users/google/', { credential }, { skipAuth: true });
        return storeSession(data);
    },

    me: async () => {
        const { data } = await api.get('/users/me/');
        return data;
    },

    logout: async () => {
        const refresh = tokens.getRefresh();
        tokens.clear();
        if (refresh) {
            try {
                await api.post('/users/logout/', { refresh }, { skipAuth: true });
            } catch {
                // already logged out locally
            }
        }
    },

    hasSession: () => !!(tokens.getAccess() || tokens.getRefresh()),
};

export const getUserById = async (userId) => {
    const { data } = await api.get(`/users/${userId}/`);
    return data;
};
