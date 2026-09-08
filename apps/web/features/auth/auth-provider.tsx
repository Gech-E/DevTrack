'use client';

import * as React from 'react';
import type { AuthUser } from '@devtrack/shared';

import { api, ApiError } from '@/lib/api';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/auth-storage';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then(setUser)
      .catch(() => {
        clearAccessToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password });
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const register = React.useCallback(async (name: string, email: string, password: string) => {
    const result = await api.register({ name, email, password });
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = React.useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
}
