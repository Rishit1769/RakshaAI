'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  preferredIdentifier: string | null;
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  rememberIdentifier: (identifier: string) => void;
  clearAuth: () => void;
}

const syncAccessToken = (token: string | null) => {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('access_token', token);
  else localStorage.removeItem('access_token');
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      preferredIdentifier: null,
      setAuth: (user, accessToken) => {
        syncAccessToken(accessToken);
        set({
          user,
          accessToken,
          isAuthenticated: true,
          preferredIdentifier: user.email || user.phone,
        });
      },
      setAccessToken: (accessToken) => {
        syncAccessToken(accessToken);
        set((state) => ({ ...state, accessToken, isAuthenticated: !!state.user }));
      },
      rememberIdentifier: (identifier) => {
        set({ preferredIdentifier: identifier });
      },
      clearAuth: () => {
        syncAccessToken(null);
        set((state) => ({ user: null, accessToken: null, isAuthenticated: false, preferredIdentifier: state.preferredIdentifier }));
      },
    }),
    {
      name: 'rakshaai-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        preferredIdentifier: state.preferredIdentifier,
      }),
    }
  )
);
