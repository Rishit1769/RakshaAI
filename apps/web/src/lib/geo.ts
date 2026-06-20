export const INDIA_CENTER = {
  latitude: 20.5937,
  longitude: 78.9629,
} as const;

export function toCoordinateNumber(value: unknown, fallback = 0) {
  const numericValue = typeof value === 'number' ? value : Number(String(value));
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function normalizeCenter(
  center: { latitude: unknown; longitude: unknown } | null | undefined,
  fallback = INDIA_CENTER
) {
  return {
    latitude: toCoordinateNumber(center?.latitude, fallback.latitude),
    longitude: toCoordinateNumber(center?.longitude, fallback.longitude),
  };
}

export function getCurrentBrowserLocation() {
  return new Promise<{ latitude: number; longitude: number }>((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(INDIA_CENTER);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => resolve(INDIA_CENTER),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}
