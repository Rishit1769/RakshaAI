import { authApi, type AuthResponse, type AuthUser } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export async function establishAuthenticatedSession(payload: AuthResponse): Promise<AuthUser> {
  const store = useAuthStore.getState();
  console.log('[auth-session] establishing authenticated session', {
    userId: payload.user.id,
    role: payload.user.role,
    hasAccessToken: Boolean(payload.accessToken),
  });
  store.setBootstrapping(true);
  store.setAuth(payload.user, payload.accessToken);

  try {
    console.log('[auth-session] requesting canonical /auth/me after login');
    const response = await authApi.getMe();
    console.log('[auth-session] /auth/me after login response', response);
    if (!response.success || !response.data) {
      throw new Error('Failed to refresh authenticated session');
    }

    useAuthStore.getState().setAuth(response.data, payload.accessToken);
    return response.data;
  } catch (error) {
    console.error('[auth-session] failed to establish authenticated session', error);
    useAuthStore.getState().clearAuth();
    throw error;
  } finally {
    console.log('[auth-session] establishAuthenticatedSession finished');
    useAuthStore.getState().setBootstrapping(false);
  }
}
