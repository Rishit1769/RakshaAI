'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        // Sync token to localStorage for the fetcher utility
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
        }
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      setTokens: (accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', accessToken);
        }
        set({ accessToken, refreshToken });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'rakshaai-auth',
      // Persist tokens and user so socket hooks and guards work after page refresh
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
