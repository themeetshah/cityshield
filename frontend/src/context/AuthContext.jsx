import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if the login session has expired after 7 days
    const isTokenExpired = () => {
        const loginTimestamp = localStorage.getItem('loginTimestamp');
        if (!loginTimestamp) return true;  // No timestamp means user never logged in
        const expirationTime = 7 * 24 * 60 * 60 * 1000;  // 7 days in milliseconds
        const currentTime = Date.now();
        return currentTime - loginTimestamp > expirationTime;  // Expired after 7 days
    };

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const storedUser = localStorage.getItem('user');
                const token = localStorage.getItem('token');

                // Check if token is expired (either JWT expired or 7-day expiration)
                if (storedUser && token && !isTokenExpired()) {
                    setUser(JSON.parse(storedUser));
                } else {
                    // Token expired, log out
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    localStorage.removeItem('loginTimestamp');
                    authService.logout();
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                authService.logout();
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();
    }, []);

    const login = async (credentials) => {
        const response = await authService.login(credentials);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('loginTimestamp', Date.now());  // Save the login timestamp
        setUser(response.user);
        return response;
    };

    const register = async (userData) => {
        const response = await authService.register(userData);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('loginTimestamp', Date.now());  // Save the login timestamp
        setUser(response.user);
        return response;
    };

    const googleLogin = async (userData) => {
        const response = await authService.loginWithGoogle(userData);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('loginTimestamp', Date.now());  // Save the login timestamp
        setUser(response.user);
        return response;
    };

    const googleSignup = async (userData) => {
        const response = await authService.signupWithGoogle(userData);
        return response;
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('loginTimestamp');
        authService.logout();
        setUser(null);
    };

    const value = {
        user,
        login,
        register,
        googleLogin,
        googleSignup,
        logout,
        loading,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
