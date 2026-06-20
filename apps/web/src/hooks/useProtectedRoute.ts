'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function useProtectedRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken, isAuthenticated, isHydrated, isBootstrapping } = useAuthStore();

  const isAuthReady = isHydrated && !isBootstrapping;

  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    if (isAuthReady && isAuthenticated && user?.mustChangePassword && pathname !== '/dashboard/settings') {
      router.replace('/dashboard/settings');
    }
  }, [isAuthReady, isAuthenticated, pathname, router, user?.mustChangePassword]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isAuthReady,
  };
}
