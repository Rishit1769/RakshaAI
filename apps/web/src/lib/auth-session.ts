import { authApi, type AuthResponse, type AuthUser } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export async function establishAuthenticatedSession(payload: AuthResponse): Promise<AuthUser> {
  const store = useAuthStore.getState();
  store.setBootstrapping(true);
  store.setAuth(payload.user, payload.accessToken);

  try {
    const response = await authApi.getMe();
    if (!response.success || !response.data) {
      throw new Error('Failed to refresh authenticated session');
    }

    useAuthStore.getState().setAuth(response.data, payload.accessToken);
    return response.data;
  } catch (error) {
    useAuthStore.getState().clearAuth();
    throw error;
  } finally {
    useAuthStore.getState().setBootstrapping(false);
  }
}
