import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount, verify token & load user
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (!savedToken) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setToken(savedToken);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) return null;
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch {
      return null;
    }
  }, []);

  // Automatic verification of delegation due date & real-time sync
  useEffect(() => {
    if (!token || !user) return;

    // Periodic check every 30s to auto-expire features when due date is reached
    const interval = setInterval(() => {
      if (user.isDelegatedAdmin && user.delegation?.endDate) {
        if (new Date(user.delegation.endDate) < new Date()) {
          refreshUser();
        }
      }
    }, 30000);

    const onFocus = () => { refreshUser(); };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [token, user, refreshUser]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  }, []);

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data);
    const { token: newToken, user: newUser } = res.data;
    if (newToken) {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    }
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    const updated = { ...user, ...userData };
    setUser(updated);
    localStorage.setItem('user', JSON.stringify(updated));
  }, [user]);

  const isDelegatedAdminActive = Boolean(
    user?.isDelegatedAdmin &&
    user?.delegation?.isActive !== false &&
    (!user?.delegation?.endDate || new Date(user.delegation.endDate) >= new Date())
  );

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateUser,
      refreshUser,
      isDelegatedAdminActive,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
