import { useAuthStore } from '@/store/auth.store';
import { readAccessToken, writeAccessToken } from '@/lib/auth-storage';
import { buildApiUrl } from '@/lib/runtime-config';

/**
 * Core fetch wrapper for all RakshaAI API calls.
 * - Injects Bearer token from session state
 * - Uses HttpOnly cookie for refresh and auto-recovers on 401
 * - Centralised error handling
 * - Typed generic responses
 * - NO Axios — native Fetch API only
 */

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
    public readonly body?: unknown,
    public readonly code?: 'TIMEOUT' | 'NETWORK' | 'HTTP' | 'PARSE'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

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
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new DOMException('Request timed out', 'AbortError'));
  }, DEFAULT_REQUEST_TIMEOUT_MS);
  const requestInit: RequestInit = {
    ...rest,
    credentials: 'include',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: abortController.signal,
  };

  console.log('[api] request', {
    url: requestUrl,
    method: requestInit.method ?? 'GET',
    timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
  });

  let response: Response;
  try {
    response = await fetch(requestUrl, requestInit);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('[api] request timed out', {
        url: requestUrl,
        method: requestInit.method ?? 'GET',
        timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
      });
      throw new ApiError(
        'Request timed out. Please check that the backend is reachable.',
        408,
        { url: requestUrl, method: requestInit.method ?? 'GET', timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS },
        'TIMEOUT'
      );
    }

    console.error('[api] network error', {
      url: requestUrl,
      method: requestInit.method ?? 'GET',
      error,
    });
    throw new ApiError(
      'Unable to reach the server. Please check your connection.',
      0,
      { url: requestUrl, method: requestInit.method ?? 'GET', cause: error },
      'NETWORK'
    );
  }

  clearTimeout(timeoutId);

  const responseText = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const isJsonResponse = contentType.includes('application/json');

  let data: ApiResponse<T> | null = null;
  if (responseText) {
    if (isJsonResponse) {
      try {
        data = JSON.parse(responseText) as ApiResponse<T>;
      } catch {
        throw new ApiError('Failed to parse server JSON response', response.status, responseText, 'PARSE');
      }
    } else if (response.ok) {
      throw new ApiError('Unexpected non-JSON response from server', response.status, responseText, 'PARSE');
    }
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

    if (response.status === 404) {
      throw new ApiError(
        'API endpoint not found. Check NEXT_PUBLIC_API_URL configuration.',
        response.status,
        data ?? responseText,
        'HTTP'
      );
    }

    throw new ApiError(
      data?.message ?? `Server returned status ${response.status}`,
      response.status,
      data ?? responseText,
      'HTTP'
    );
  }

  if (!data) {
    throw new ApiError('Empty response from server', response.status, responseText, 'PARSE');
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
