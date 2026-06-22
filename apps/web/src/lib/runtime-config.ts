const LOCAL_API_BASE = 'http://127.0.0.1:5000/api';
const LOCAL_SOCKET_BASE = 'http://127.0.0.1:5000';
const INVALID_DEV_HOSTS = new Set(['0.0.0.0']);

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isInvalidDevelopmentUrl(value: string): boolean {
  if (!isAbsoluteHttpUrl(value)) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return INVALID_DEV_HOSTS.has(parsed.hostname);
  } catch {
    return true;
  }
}

function getWindowOrigin(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location.origin;
}

export function getApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredBase) {
    if (process.env.NODE_ENV === 'development' && isInvalidDevelopmentUrl(configuredBase)) {
      return LOCAL_API_BASE;
    }

    return trimTrailingSlashes(configuredBase);
  }

  const windowOrigin = getWindowOrigin();
  if (windowOrigin) {
    return `${windowOrigin}/api`;
  }

  return process.env.NODE_ENV === 'production' ? '/api' : LOCAL_API_BASE;
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiBase = getApiBase();

  if (isAbsoluteHttpUrl(apiBase)) {
    return `${apiBase}${normalizedPath}`;
  }

  const windowOrigin = getWindowOrigin();
  if (windowOrigin) {
    return new URL(`${apiBase}${normalizedPath}`, windowOrigin).toString();
  }

  return `${apiBase}${normalizedPath}`;
}

export function getSocketBaseUrl(): string | null {
  const configuredBase =
    process.env.NEXT_PUBLIC_WS_URL?.trim() ??
    process.env.NEXT_PUBLIC_SOCKET_URL?.trim();

  if (configuredBase) {
    if (process.env.NODE_ENV === 'development' && isInvalidDevelopmentUrl(configuredBase)) {
      return LOCAL_SOCKET_BASE;
    }

    return trimTrailingSlashes(configuredBase);
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiBase) {
    if (process.env.NODE_ENV === 'development' && isInvalidDevelopmentUrl(apiBase)) {
      return LOCAL_SOCKET_BASE;
    }

    return trimTrailingSlashes(apiBase).replace(/\/api$/, '');
  }

  const windowOrigin = getWindowOrigin();
  if (windowOrigin) {
    return windowOrigin;
  }

  return process.env.NODE_ENV === 'production' ? null : LOCAL_SOCKET_BASE;
}
