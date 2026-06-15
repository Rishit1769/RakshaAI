import { useAuthStore } from '@/store/auth.store';
import { readAccessToken, writeAccessToken } from '@/lib/auth-storage';

/**
 * Core fetch wrapper for all RakshaAI API calls.
 * - Injects Bearer token from session state
 * - Uses HttpOnly cookie for refresh and auto-recovers on 401
 * - Centralised error handling
 * - Typed generic responses
 * - NO Axios — native Fetch API only
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(/\/+$/, '');

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown[];
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return readAccessToken();
}

let isRefreshing = false;
let pendingRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && pendingRefresh) return pendingRefresh;

  isRefreshing = true;
  pendingRefresh = (async () => {
    try {
      const refreshUrl = buildApiUrl('/auth/refresh');
      console.log('[auth] refreshing access token via', refreshUrl);

      const res = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const payload = (await res.json()) as ApiResponse<{ accessToken: string }>;
      if (!res.ok || !payload.success || !payload.data?.accessToken) return null;

      writeAccessToken(payload.data.accessToken);
      useAuthStore.getState().setAccessToken(payload.data.accessToken);
      return payload.data.accessToken;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      pendingRefresh = null;
    }
  })();

  return pendingRefresh;
}

type FetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function fetcher<T>(
  path: string,
  options: FetchOptions = {},
  retried = false
): Promise<ApiResponse<T>> {
  const token = getToken();
  const { body, ...rest } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const requestUrl = buildApiUrl(path);
  const requestInit: RequestInit = {
    ...rest,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  console.log('[api] request', {
    url: requestUrl,
    method: requestInit.method ?? 'GET',
  });

  let response: Response;
  try {
    response = await fetch(requestUrl, requestInit);
  } catch (error) {
    console.error('[api] network error', {
      url: requestUrl,
      method: requestInit.method ?? 'GET',
      error,
    });
    throw error;
  }

  let data: ApiResponse<T>;
  try {
    data = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError('Failed to parse server response', response.status);
  }

  if (!response.ok) {
    if (response.status === 401 && !retried) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return fetcher<T>(path, options, true);
      }

      if (token) {
        useAuthStore.getState().clearAuth();
      }
    }
    throw new ApiError(data.message ?? 'Request failed', response.status, data);
  }

  return data;
}

// ─── Convenience methods ──────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: FetchOptions) =>
    fetcher<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    fetcher<T>(path, { ...options, method: 'POST', body }),

  patch: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    fetcher<T>(path, { ...options, method: 'PATCH', body }),

  put: <T>(path: string, body?: unknown, options?: FetchOptions) =>
    fetcher<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options?: FetchOptions) =>
    fetcher<T>(path, { ...options, method: 'DELETE' }),
};
