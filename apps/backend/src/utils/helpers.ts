/**
 * Generates a unique RakshaAI alert code.
 * Format: RK<YEAR><6-digit-random>
 */
export function generateAlertCode(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RK${year}${random}`;
}

/**
 * Calculates the Haversine distance between two GPS coordinates (in km).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Sanitizes a string by removing HTML tags and trimming whitespace.
 */
export function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
