import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, AUTH_STORAGE_KEY } from '../lib/auth';
import { RequireAuth, RequireRole } from './RequireAuth';

function Tree({ initial }: { initial: string }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route
            path="/manager"
            element={
              <RequireAuth>
                <RequireRole role="manager">
                  <div>MANAGER PAGE</div>
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/technician"
            element={
              <RequireAuth>
                <RequireRole role="technician">
                  <div>TECH PAGE</div>
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('RequireAuth + RequireRole', () => {
  it('redirects unauthenticated users to /login', () => {
    render(<Tree initial="/manager" />);
    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
  });

  it('lets authenticated user with correct role through', () => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt',
        user: { id: 'u1', email: 'm@x.io', role: 'manager' },
      }),
    );
    render(<Tree initial="/manager" />);
    expect(screen.getByText('MANAGER PAGE')).toBeInTheDocument();
  });

  it('redirects authenticated user with wrong role to their home', () => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'jwt',
        user: { id: 'u2', email: 't@x.io', role: 'technician' },
      }),
    );
    render(<Tree initial="/manager" />);
    expect(screen.getByText('TECH PAGE')).toBeInTheDocument();
  });
});
