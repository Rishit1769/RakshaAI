'use client';

import { useEffect, useRef } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { readAccessToken } from '@/lib/auth-storage';
import { useAuthStore } from '@/store/auth.store';

export default function AuthBootstrap() {
  const hasBootstrapped = useRef(false);
  const {
    user,
    accessToken,
    isHydrated,
    setAuth,
    setAccessToken,
    setBootstrapping,
    clearAuth,
  } = useAuthStore();

  useEffect(() => {
    if (!isHydrated || hasBootstrapped.current) return;

    hasBootstrapped.current = true;
    let cancelled = false;
    let didFinish = false;
    const timeout = window.setTimeout(() => {
      if (didFinish || cancelled) return;
      console.warn('Session check timed out — clearing loading state');
      clearAuth();
      setBootstrapping(false);
    }, 8000);

    const bootstrapAuth = async () => {
      setBootstrapping(true);

      const storedToken = accessToken ?? readAccessToken();
      const hasStoredSession = Boolean(storedToken || user);

      if (!hasStoredSession) {
        if (!cancelled) {
          didFinish = true;
          setBootstrapping(false);
        }
        return;
      }

      if (storedToken && storedToken !== accessToken) {
        setAccessToken(storedToken);
      }

      try {
        const response = await authApi.getMe();
        if (!response.success || !response.data) {
          throw new Error('Failed to restore session');
        }

        const latestToken = readAccessToken() ?? storedToken;
        if (!latestToken) {
          throw new Error('Access token unavailable after session restore');
        }

        if (!cancelled) {
          setAuth(response.data, latestToken);
        }
      } catch {
        if (!cancelled) {
          clearAuth();
        }
      } finally {
        if (!cancelled) {
          didFinish = true;
          setBootstrapping(false);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [accessToken, clearAuth, isHydrated, setAccessToken, setAuth, setBootstrapping, user]);

  return null;
}
