import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import { Login } from './Login';

const ORIGINAL_FETCH = globalThis.fetch;

function Tree() {
  return (
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/manager" element={<div>MANAGER HOME</div>} />
          <Route path="/technician" element={<div>TECH HOME</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('Login route', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('renders email + password form', () => {
    render(<Tree />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('redirects manager to /manager on success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: 'jwt-mgr',
          user: { id: 'u1', email: 'mgr@x.io', role: 'manager' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    render(<Tree />);
    await user.type(screen.getByLabelText(/email/i), 'mgr@x.io');
    await user.type(screen.getByLabelText(/password/i), 'pw');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('MANAGER HOME')).toBeInTheDocument();
    });
  });

  it('redirects technician to /technician on success', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          token: 'jwt-tech',
          user: { id: 'u2', email: 'tech@x.io', role: 'technician' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    render(<Tree />);
    await user.type(screen.getByLabelText(/email/i), 'tech@x.io');
    await user.type(screen.getByLabelText(/password/i), 'pw');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('TECH HOME')).toBeInTheDocument();
    });
  });

  it('shows an error message on 401', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid credentials' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    render(<Tree />);
    await user.type(screen.getByLabelText(/email/i), 'x@x.io');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid/i);
    });
  });
});
