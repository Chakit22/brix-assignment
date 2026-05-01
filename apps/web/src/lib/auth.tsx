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

export class StorageUnavailableError extends Error {
  constructor(message = 'Browser storage is unavailable.') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn('localStorage.getItem failed', err);
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    console.warn('localStorage.setItem failed', err);
    throw new StorageUnavailableError(
      "Your browser is blocking site storage, so we can't keep you signed in.",
    );
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn('localStorage.removeItem failed', err);
  }
}

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  const raw = safeGetItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      parsed?.token &&
      parsed.user?.id &&
      (parsed.user.role === 'manager' || parsed.user.role === 'technician')
    ) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('Failed to parse auth session from localStorage', err);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const restored = readSession();
    if (restored?.token) apiClient.setToken(restored.token);
    return restored;
  });

  useEffect(() => {
    apiClient.setToken(session?.token ?? null);
  }, [session?.token]);

  const logout = useCallback(() => {
    setSession(null);
    apiClient.setToken(null);
    safeRemoveItem(AUTH_STORAGE_KEY);
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
    safeSetItem(AUTH_STORAGE_KEY, JSON.stringify(next));
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
