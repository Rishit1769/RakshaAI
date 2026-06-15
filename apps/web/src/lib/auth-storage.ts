'use client';

export const ACCESS_TOKEN_STORAGE_KEY = 'access_token';

export function readAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function writeAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function syncAccessToken(token: string | null): void {
  if (!token) {
    clearAccessToken();
    return;
  }

  writeAccessToken(token);
}
