import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiClient, ApiError } from './api';

export type Role = 'manager' | 'technician';

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

export const AUTH_STORAGE_KEY = 'brix.auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed?.token && parsed.user?.id && parsed.user.role) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());

  useEffect(() => {
    apiClient.setToken(session?.token ?? null);
  }, [session?.token]);

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    apiClient.setToken(null);
    setSession(null);
  }, []);

  useEffect(() => {
    apiClient.setOnUnauthorized(() => logout());
    return () => apiClient.setOnUnauthorized(undefined);
  }, [logout]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const next = await apiClient.post<AuthSession>('/auth/login', { email, password });
    if (!next?.token || !next.user) {
      throw new ApiError(500, next, 'Malformed login response');
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    apiClient.setToken(next.token);
    setSession(next);
    return next.user;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      login,
      logout,
    }),
    [session, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function homePathForRole(role: Role): string {
  return role === 'manager' ? '/manager' : '/technician';
}
