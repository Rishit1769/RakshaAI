/**
 * Generates a unique RakshaAI alert code.
 * Format: RK<YEAR><6-digit-random>   e.g. RK20241A3F9E
 */
export function generateAlertCode(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RK${year}${random}`;
}

/**
 * Generates a 6-digit numeric OTP.
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Returns OTP expiry time (default: 10 minutes from now).
 */
export function getOTPExpiry(minutes = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
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
  const R = 6371; // Earth radius in km
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

/**
 * Masks a phone number for display: +91XXXXXX7890 → +91******7890
 */
export function maskPhone(phone: string): string {
  if (phone.length < 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

/**
 * Masks an email address for display: user@example.com → u**r@example.com
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local[0] + '*'.repeat(Math.max(0, local.length - 2)) + local[local.length - 1];
  return `${masked}@${domain}`;
}
