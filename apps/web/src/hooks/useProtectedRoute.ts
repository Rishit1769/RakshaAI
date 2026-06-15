'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function useProtectedRoute() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isHydrated, isBootstrapping } = useAuthStore();

  const isAuthReady = isHydrated && !isBootstrapping;

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthReady, isAuthenticated, router]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isAuthReady,
  };
}
