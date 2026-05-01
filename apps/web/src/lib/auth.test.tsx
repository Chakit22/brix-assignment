import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth, AUTH_STORAGE_KEY } from './auth';
import { apiClient } from './api';

const ORIGINAL_FETCH = globalThis.fetch;

function Probe() {
  const { user, token, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="email">{user?.email ?? 'anon'}</div>
      <div data-testid="role">{user?.role ?? 'none'}</div>
      <div data-testid="token">{token ?? ''}</div>
      <button onClick={() => login('m@x.io', 'pw')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderProbe() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    apiClient.setToken(null);
  });

  it('hydrates from localStorage on mount', () => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'persisted-jwt',
        user: { id: 'u1', email: 'm@x.io', role: 'manager' },
      }),
    );

    renderProbe();

    expect(screen.getByTestId('email').textContent).toBe('m@x.io');
    expect(screen.getByTestId('role').textContent).toBe('manager');
    expect(screen.getByTestId('token').textContent).toBe('persisted-jwt');
  });

  it('login() calls /auth/login, persists token, sets user', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: 'new-jwt',
          user: { id: 'u2', email: 'm@x.io', role: 'manager' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    renderProbe();
    await act(async () => {
      screen.getByText('login').click();
    });

    expect(screen.getByTestId('token').textContent).toBe('new-jwt');
    expect(screen.getByTestId('role').textContent).toBe('manager');
    const stored = JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY)!);
    expect(stored.token).toBe('new-jwt');
    expect(stored.user.role).toBe('manager');
  });

  it('logout() clears token and storage', async () => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt',
        user: { id: 'u1', email: 'm@x.io', role: 'manager' },
      }),
    );

    renderProbe();
    await act(async () => {
      screen.getByText('logout').click();
    });

    expect(screen.getByTestId('email').textContent).toBe('anon');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('auto-logs-out when api 401s', async () => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'expired',
        user: { id: 'u1', email: 'm@x.io', role: 'manager' },
      }),
    );
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    renderProbe();
    expect(screen.getByTestId('email').textContent).toBe('m@x.io');

    await act(async () => {
      try {
        await apiClient.get('/me');
      } catch {
        /* expected */
      }
    });

    expect(screen.getByTestId('email').textContent).toBe('anon');
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});
