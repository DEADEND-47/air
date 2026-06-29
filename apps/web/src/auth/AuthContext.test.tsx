import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { api, refreshStore, tokenStore } from '../lib/api';
import type { User } from '../lib/types';

vi.mock('../lib/api', () => ({
  api: {
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    sendPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
  },
  tokenStore: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
  refreshStore: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
}));

describe('AuthContext & Provider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(tokenStore.get).mockReturnValue(null);
    vi.mocked(refreshStore.get).mockReturnValue(null);
  });

  it('restores user when an access token exists', async () => {
    vi.mocked(tokenStore.get).mockReturnValue('valid-token');
    const mockUser: User = { id: 'usr-1', email: 'test@airiq.local', name: 'Tester', role: 'analyst', active: true };
    vi.mocked(api.me).mockResolvedValue({ user: mockUser });

    const TestComponent = () => {
      const { user, loading } = useAuth();
      if (loading) return <div>Loading...</div>;
      return <div>User: {user?.name}</div>;
    };

    render(<AuthProvider><TestComponent /></AuthProvider>);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(screen.getByText('User: Tester')).toBeInTheDocument();
    expect(api.me).toHaveBeenCalledTimes(1);
  });

  it('performs login successfully', async () => {
    const mockUser: User = { id: 'usr-1', email: 'test@airiq.local', name: 'Tester', role: 'analyst', active: true };
    vi.mocked(api.login).mockResolvedValue({ accessToken: 'new-token', refreshToken: 'refresh-token', user: mockUser, expiresIn: 3600 });

    const TestComponent = () => {
      const { user, login } = useAuth();
      return <div><div>User: {user?.name || 'none'}</div><button onClick={() => login('test@airiq.local', 'password')}>Login</button></div>;
    };

    render(<AuthProvider><TestComponent /></AuthProvider>);
    await act(async () => { screen.getByText('Login').click(); });

    expect(screen.getByText('User: Tester')).toBeInTheDocument();
    expect(tokenStore.set).toHaveBeenCalledWith('new-token');
    expect(refreshStore.set).toHaveBeenCalledWith('refresh-token');
  });

  it('stores tokens after registration', async () => {
    const mockUser: User = { id: 'usr-2', email: 'new@airiq.local', name: 'New User', role: 'viewer', active: true };
    vi.mocked(api.register).mockResolvedValue({ accessToken: 'register-token', refreshToken: 'register-refresh', user: mockUser, expiresIn: 3600 });

    const TestComponent = () => {
      const { user, register } = useAuth();
      return <div><div>User: {user?.name || 'none'}</div><button onClick={() => register('New User', 'new@airiq.local', 'password123')}>Register</button></div>;
    };

    render(<AuthProvider><TestComponent /></AuthProvider>);
    await act(async () => { screen.getByText('Register').click(); });

    expect(screen.getByText('User: New User')).toBeInTheDocument();
    expect(tokenStore.set).toHaveBeenCalledWith('register-token');
    expect(refreshStore.set).toHaveBeenCalledWith('register-refresh');
  });


  it('performs logout successfully', async () => {
    vi.mocked(tokenStore.get).mockReturnValue('valid-token');
    vi.mocked(refreshStore.get).mockReturnValue('refresh-token');
    const mockUser: User = { id: 'usr-1', email: 'test@airiq.local', name: 'Tester', role: 'analyst', active: true };
    vi.mocked(api.me).mockResolvedValue({ user: mockUser });

    const TestComponent = () => {
      const { user, logout, loading } = useAuth();
      if (loading) return <div>Loading...</div>;
      return <div><div>User: {user?.name || 'none'}</div><button onClick={logout}>Logout</button></div>;
    };

    render(<AuthProvider><TestComponent /></AuthProvider>);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    await act(async () => { screen.getByText('Logout').click(); });

    expect(screen.getByText('User: none')).toBeInTheDocument();
    expect(tokenStore.clear).toHaveBeenCalledTimes(1);
    expect(refreshStore.clear).toHaveBeenCalledTimes(1);
  });
});
