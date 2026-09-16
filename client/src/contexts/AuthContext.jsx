import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from './SocketContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('sahaayak_token') || null);
  const [loading, setLoading] = useState(true);
  const { joinUserRoom } = useSocket();

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        if (res.data.user?.id) {
          joinUserRoom(res.data.user.id);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        localStorage.removeItem('sahaayak_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.requires2FA) {
      return res.data; // Return challenge
    }
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('sahaayak_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser?.id) {
      joinUserRoom(newUser.id);
    }
    return res.data;
  };

  const verify2FA = async (tempUserId, code) => {
    const res = await api.post('/auth/2fa/verify', { tempUserId, code });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('sahaayak_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser?.id) {
      joinUserRoom(newUser.id);
    }
    return res.data;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('sahaayak_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser?.id) {
      joinUserRoom(newUser.id);
    }
    return res.data;
  };

  const logout = async () => {
    try {
      if (token) await api.post('/auth/logout');
    } catch (e) {}
    localStorage.removeItem('sahaayak_token');
    setToken(null);
    setUser(null);
  };

  const quickDemoLogin = async (demoAccount) => {
    const res = await login(demoAccount.email, demoAccount.password);
    if (res.requires2FA) {
      return await verify2FA(res.tempUserId, demoAccount.twoFactorCode || '123456');
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        verify2FA,
        register,
        logout,
        quickDemoLogin,
        refreshUser: async () => {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
