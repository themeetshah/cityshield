/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth';
import { onSessionExpired } from '../services/tokens';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // The role is always taken from the server, never from storage.
    const refreshUser = useCallback(async () => {
        const me = await authService.me();
        setUser(me);
        return me;
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!authService.hasSession()) {
                setLoading(false);
                return;
            }
            try {
                const me = await authService.me();
                if (!cancelled) setUser(me);
            } catch {
                await authService.logout();
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => onSessionExpired(() => setUser(null)), []);

    const finishAuth = useCallback(
        async (response) => {
            try {
                await refreshUser();
            } catch {
                setUser(response.user);
            }
            return response;
        },
        [refreshUser]
    );

    const login = useCallback(async (credentials) => finishAuth(await authService.login(credentials)), [finishAuth]);
    const register = useCallback(async (payload) => finishAuth(await authService.register(payload)), [finishAuth]);
    const googleAuth = useCallback(async (credential) => finishAuth(await authService.googleAuth(credential)), [finishAuth]);

    const logout = useCallback(async () => {
        await authService.logout();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            isAuthenticated: !!user,
            login,
            register,
            googleAuth,
            logout,
            refreshUser,
            setUser,
        }),
        [user, loading, login, register, googleAuth, logout, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
