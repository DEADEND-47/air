/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, refreshStore, tokenStore } from '../lib/api';
import type { User } from '../lib/types';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login(email: string, password: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get() || refreshStore.get()));

  useEffect(() => {
    const restore = async () => {
      try {
        if (!tokenStore.get() && refreshStore.get()) {
          const refreshed = await api.refreshToken(refreshStore.get()!);
          tokenStore.set(refreshed.accessToken);
        }
        if (tokenStore.get()) {
          const result = await api.me();
          setUser(result.user);
        }
      } catch {
        tokenStore.clear();
        refreshStore.clear();
      } finally {
        setLoading(false);
      }
    };
    void restore();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.login(email, password);
    tokenStore.set(result.accessToken);
    refreshStore.set(result.refreshToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const result = await api.register(name, email, password);
    tokenStore.set(result.accessToken);
    refreshStore.set(result.refreshToken);
    setUser(result.user);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    await api.sendPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    await api.resetPassword(token, newPassword);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(refreshStore.get() ?? undefined); } catch { /* ignore logout network errors */ }
    tokenStore.clear();
    refreshStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, sendPasswordReset, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
