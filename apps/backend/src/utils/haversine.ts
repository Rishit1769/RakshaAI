export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function isWithinRadius(
  center: { latitude: number; longitude: number },
  point: { latitude: number; longitude: number },
  radiusKm: number
): boolean {
  return haversineDistance(center.latitude, center.longitude, point.latitude, point.longitude) <= radiusKm;
}

function toRadians(value: number): number {
  return value * (Math.PI / 180);
}
