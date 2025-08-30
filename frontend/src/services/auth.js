import api from './api';

export const authService = {
    // Register
    register: async (userData) => {
        const response = await api.post('/users/register/', userData);
        return response.data;
    },

    // Login user
    login: async (credentials) => {
        const response = await api.post('/users/login/', credentials);
        return response.data;
    },

    // Google signup
    signupWithGoogle: async (userData) => {
        const response = await api.post('/users/google-signup/', userData);
        return response.data;
    },

    // Google login
    loginWithGoogle: async (userData) => {
        const response = await api.post('/users/google-login/', userData);
        return response.data;
    },

    // Get user profile
    getProfile: async () => {
        const response = await api.get('/users/profile/');
        return response.data;
    },


    // Logout user
    logout: () => {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = localStorage.getItem('access');
        return !!token;
    },
};

export const getUserById = async (userid) => {
    const response = await api.get(`/users/${userid}/`);
    return response.data;
}