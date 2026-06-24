import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act, renderHook } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { api, tokenStore } from '../lib/api';
import type { User } from '../lib/types';

vi.mock('../lib/api', () => {
  return {
    api: {
      me: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      sendPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    },
    tokenStore: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
    refreshStore: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
    sessionStore: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    },
  };
});

describe('AuthContext & Provider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should throw error if useAuth is used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider'
    );
  });

  it('should restore user if token is present', async () => {
    vi.mocked(tokenStore.get).mockReturnValue('valid-token');
    const mockUser: User = { id: 'usr-1', email: 'test@airiq.city', name: 'Tester', role: 'analyst', active: true, emailVerified: true };
    vi.mocked(api.me).mockResolvedValue({ user: mockUser });

    const TestComponent = () => {
      const { user, loading } = useAuth();
      if (loading) return <div>Loading...</div>;
      return <div>User: {user?.name}</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial render when api.me is unresolved
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for resolve
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('User: Tester')).toBeInTheDocument();
    expect(api.me).toHaveBeenCalledTimes(1);
  });

  it('should perform login successfully', async () => {
    const mockUser: User = { id: 'usr-1', email: 'test@airiq.city', name: 'Tester', role: 'analyst', active: true, emailVerified: true };
    vi.mocked(api.login).mockResolvedValue({ accessToken: 'new-token', user: mockUser, sessionId: 'sess-1', expiresIn: 28800 });

    const TestComponent = () => {
      const { user, login } = useAuth();
      return (
        <div>
          <div>User: {user?.name || 'none'}</div>
          <button onClick={() => login('test@airiq.city', 'password')}>Login</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('User: none')).toBeInTheDocument();

    const button = screen.getByText('Login');
    await act(async () => {
      button.click();
    });

    expect(screen.getByText('User: Tester')).toBeInTheDocument();
    expect(tokenStore.set).toHaveBeenCalledWith('new-token');
  });

  it('should perform logout successfully', async () => {
    vi.mocked(tokenStore.get).mockReturnValue('valid-token');
    const mockUser: User = { id: 'usr-1', email: 'test@airiq.city', name: 'Tester', role: 'analyst', active: true, emailVerified: true };
    vi.mocked(api.me).mockResolvedValue({ user: mockUser });

    const TestComponent = () => {
      const { user, logout, loading } = useAuth();
      if (loading) return <div>Loading...</div>;
      return (
        <div>
          <div>User: {user?.name || 'none'}</div>
          <button onClick={logout}>Logout</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText('User: Tester')).toBeInTheDocument();

    const button = screen.getByText('Logout');
    await act(async () => {
      button.click();
    });

    expect(screen.getByText('User: none')).toBeInTheDocument();
    expect(tokenStore.clear).toHaveBeenCalledTimes(1);
  });
});
