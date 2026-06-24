/* eslint-disable react-refresh/only-export-components */
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';
import { api, refreshStore, sessionStore, tokenStore } from '../lib/api';
import { isSupabaseAuthEnabled, setActiveSession, supabase } from '../lib/supabase';
import type { User } from '../lib/types';

interface AuthValue {
  user: User | null;
  loading: boolean;
  login(email: string, password: string, rememberMe?: boolean): Promise<void>;
  loginWithOtp(email: string, code: string): Promise<void>;
  register(name: string, email: string, password: string): Promise<{ userId: string; message: string }>;
  verifyEmail(email: string, code: string): Promise<void>;
  resendVerification(email: string): Promise<void>;
  sendLoginOtp(email: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseAuthEnabled ? true : Boolean(tokenStore.get() || refreshStore.get()));

  // On mount: try to restore session
  useEffect(() => {
    if (isSupabaseAuthEnabled && supabase) {
      let alive = true;
      void supabase.auth.getSession().then(({ data }) => {
        if (!alive) return;
        setActiveSession(data.session);
        setUser(data.session?.user ? ({
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          name: (data.session.user.user_metadata?.name as string | undefined) ?? data.session.user.email ?? 'Operator',
          role: (data.session.user.user_metadata?.role as User['role'] | undefined) ?? 'standard_user',
          active: true,
          emailVerified: Boolean(data.session.user.email_confirmed_at),
        } satisfies User) : null);
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setActiveSession(session);
        setUser(session?.user ? ({
          id: session.user.id,
          email: session.user.email ?? '',
          name: (session.user.user_metadata?.name as string | undefined) ?? session.user.email ?? 'Operator',
          role: (session.user.user_metadata?.role as User['role'] | undefined) ?? 'standard_user',
          active: true,
          emailVerified: Boolean(session.user.email_confirmed_at),
        } satisfies User) : null);
        setLoading(false);
      });

      return () => {
        alive = false;
        subscription.unsubscribe();
      };
    }

    const token = tokenStore.get();
    const refresh = refreshStore.get();

    if (!token && !refresh) {
      setLoading(false);
      return;
    }

    if (token) {
      api.me()
        .then(({ user: current }) => setUser(current))
        .catch(async () => {
          // Token expired — try refresh
          if (refresh) {
            try {
              const result = await api.refreshToken(refresh);
              tokenStore.set(result.accessToken);
              const { user: current } = await api.me();
              setUser(current);
            } catch {
              tokenStore.clear(); refreshStore.clear(); sessionStore.clear();
            }
          } else {
            tokenStore.clear();
          }
        })
        .finally(() => setLoading(false));
    } else if (refresh) {
      api.refreshToken(refresh)
        .then(async (result) => {
          tokenStore.set(result.accessToken);
          const { user: current } = await api.me();
          setUser(current);
        })
        .catch(() => { refreshStore.clear(); sessionStore.clear(); })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setActiveSession(data.session);
      return;
    }
    const result = await api.login(email, password, rememberMe);
    tokenStore.set(result.accessToken);
    if (result.refreshToken) refreshStore.set(result.refreshToken);
    sessionStore.set(result.sessionId);
    setUser(result.user);
  }, []);

  const loginWithOtp = useCallback(async (email: string, code: string) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
      setActiveSession(data.session);
      return;
    }
    const result = await api.loginWithOtp(email, code);
    tokenStore.set(result.accessToken);
    if (result.refreshToken) refreshStore.set(result.refreshToken);
    sessionStore.set(result.sessionId);
    setUser(result.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: 'standard_user' } },
      });
      if (error) throw error;
      setActiveSession(data.session);
      return { userId: data.user?.id ?? '', message: 'Account created. Check your email for a verification code.' };
    }
    return api.register(name, email, password);
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) throw error;
      setActiveSession(data.session);
      return;
    }
    await api.verifyEmail(email, code);
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      return;
    }
    await api.resendVerification(email);
  }, []);

  const sendLoginOtp = useCallback(async (email: string) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) throw error;
      return;
    }
    await api.sendLoginOtp(email);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      return;
    }
    await api.sendPasswordReset(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    if (isSupabaseAuthEnabled && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return;
    }
    await api.resetPassword(token, newPassword);
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseAuthEnabled && supabase) {
      const { error } = await supabase.auth.signOut();
      setActiveSession(null);
      setUser(null);
      if (error) throw error;
      return;
    }
    const sid = sessionStore.get();
    try { await api.logout(sid ?? undefined); } catch { /* ignore network errors on logout */ }
    tokenStore.clear();
    refreshStore.clear();
    sessionStore.clear();
    setUser(null);
  }, []);

  const value: AuthValue = {
    user, loading,
    login, loginWithOtp,
    register, verifyEmail, resendVerification,
    sendLoginOtp, sendPasswordReset, resetPassword,
    logout,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
