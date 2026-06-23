'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { readAccessToken, syncAccessToken } from '@/lib/auth-storage';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  mpinEnabled?: boolean;
  mustChangePassword: boolean;
  departmentId?: string | null;
  ngoId?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  preferredIdentifier: string | null;
  isHydrated: boolean;
  isBootstrapping: boolean;
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (accessToken: string | null) => void;
  setBootstrapping: (value: boolean) => void;
  rememberIdentifier: (identifier: string) => void;
  markHydrated: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      preferredIdentifier: null,
      isHydrated: false,
      isBootstrapping: true,
      setAuth: (user, accessToken) => {
        syncAccessToken(accessToken);
        set({
          user,
          accessToken,
          isAuthenticated: true,
          preferredIdentifier: user.email,
          isBootstrapping: false,
        });
      },
      setAccessToken: (accessToken) => {
        syncAccessToken(accessToken);
        set((state) => ({
          ...state,
          accessToken,
          isAuthenticated: Boolean(accessToken && state.user),
          isBootstrapping: false,
        }));
      },
      setBootstrapping: (value) => {
        set({ isBootstrapping: value });
      },
      rememberIdentifier: (identifier) => {
        set({ preferredIdentifier: identifier });
      },
      markHydrated: () => {
        set({ isHydrated: true });
      },
      clearAuth: () => {
        syncAccessToken(null);
        set((state) => ({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          preferredIdentifier: state.preferredIdentifier,
          isBootstrapping: false,
        }));
      },
    }),
    {
      name: 'rakshaai-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        preferredIdentifier: state.preferredIdentifier,
      }),
      onRehydrateStorage: () => (state) => {
        const token = state?.accessToken ?? readAccessToken();

        if (state) {
          state.setAccessToken(token);
          state.markHydrated();
        }
      },
    }
  )
);
