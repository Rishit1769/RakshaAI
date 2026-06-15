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

    const bootstrapAuth = async () => {
      setBootstrapping(true);

      const storedToken = accessToken ?? readAccessToken();
      const hasStoredSession = Boolean(storedToken || user);

      if (!hasStoredSession) {
        if (!cancelled) setBootstrapping(false);
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
          setBootstrapping(false);
        }
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearAuth, isHydrated, setAccessToken, setAuth, setBootstrapping, user]);

  return null;
}
