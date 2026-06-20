'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProtectedRoute } from './useProtectedRoute';

export function useRoleGuard(expectedRole: string) {
  const router = useRouter();
  const auth = useProtectedRoute();

  useEffect(() => {
    if (!auth.isAuthReady || !auth.isAuthenticated || !auth.user) return;
    if (auth.user.role !== expectedRole) {
      router.replace('/auth/login');
    }
  }, [auth.isAuthReady, auth.isAuthenticated, auth.user, expectedRole, router]);

  const isAllowed = auth.isAuthReady && auth.isAuthenticated && auth.user?.role === expectedRole;
  return { ...auth, isAllowed };
}
