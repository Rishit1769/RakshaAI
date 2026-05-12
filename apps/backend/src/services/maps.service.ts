import { prisma } from '../config/database';
import { haversineDistance } from '../utils/helpers';

export interface NearbyQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

// ─── Nearby Volunteers ───────────────────────────────────────────────────────

export async function getNearbyVolunteers(query: NearbyQuery) {
  const { latitude, longitude, radiusKm } = query;

  // Fetch available volunteers with last known location using raw SQL for PostGIS
  const volunteers = await prisma.$queryRaw<
    Array<{
      id: string;
      user_id: string;
      full_name: string;
      rating: number;
      service_radius_km: number;
      lat: number;
      lng: number;
      distance_km: number;
    }>
  >`
    SELECT
      v.id,
      v.user_id,
      u.full_name,
      v.rating::float,
      v.service_radius_km,
      ul.latitude  AS lat,
      ul.longitude AS lng,
      (
        6371 * acos(
          cos(radians(${latitude})) * cos(radians(ul.latitude)) *
          cos(radians(ul.longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(ul.latitude))
        )
      ) AS distance_km
    FROM volunteers v
    JOIN users u ON u.id = v.user_id
    JOIN LATERAL (
      SELECT latitude, longitude
      FROM user_locations
      WHERE user_id = v.user_id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) ul ON TRUE
    WHERE v.status = 'available'
      AND v.verification_status = 'verified'
    HAVING (
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(ul.latitude)) *
        cos(radians(ul.longitude) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(ul.latitude))
      )
    ) <= ${radiusKm}
    ORDER BY distance_km ASC
    LIMIT 20
  `;

  return volunteers;
}

// ─── Nearby Police Stations ──────────────────────────────────────────────────

export async function getNearbyPoliceStations(query: NearbyQuery) {
  const { latitude, longitude, radiusKm } = query;

  const stations = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      address: string;
      city: string;
      phone_primary: string | null;
      latitude: number;
      longitude: number;
      distance_km: number;
    }>
  >`
    SELECT
      id,
      name,
      address,
      city,
      phone_primary,
      latitude,
      longitude,
      (
        6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(latitude))
        )
      ) AS distance_km
    FROM police_stations
    WHERE is_active = true
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
    HAVING (
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    ) <= ${radiusKm}
    ORDER BY distance_km ASC
    LIMIT 10
  `;

  return stations;
}

// ─── Nearby Safe Zones ────────────────────────────────────────────────────────

export async function getNearbySafeZones(query: NearbyQuery) {
  const { latitude, longitude, radiusKm } = query;

  const zones = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      type: string;
      address: string | null;
      phone: string | null;
      is_24x7: boolean;
      latitude: number;
      longitude: number;
      distance_km: number;
    }>
  >`
    SELECT
      id,
      name,
      type,
      address,
      phone,
      is_24x7,
      latitude,
      longitude,
      (
        6371 * acos(
          cos(radians(${latitude})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${longitude})) +
          sin(radians(${latitude})) * sin(radians(latitude))
        )
      ) AS distance_km
    FROM safe_zones
    WHERE is_active = true
      AND is_verified = true
    HAVING (
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    ) <= ${radiusKm}
    ORDER BY distance_km ASC
    LIMIT 15
  `;

  return zones;
}

// ─── Area Risk Assessment ─────────────────────────────────────────────────────

export async function getAreaRiskData(query: NearbyQuery) {
  const { latitude, longitude, radiusKm } = query;

  // Count recent incidents in radius (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [incidentCount, hotspots, safeZoneCount] = await Promise.all([
    prisma.communityReport.count({
      where: {
        isActive: true,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.safetyHotspot
      ? prisma.$queryRaw<Array<{ id: string; risk_level: string; incident_count: number }>>`
          SELECT id, risk_level, incident_count
          FROM safety_hotspots
          WHERE is_active = true
          LIMIT 5
        `
      : Promise.resolve([]),
    prisma.safeZone.count({ where: { isActive: true, isVerified: true } }),
  ]);

  // Simple risk score: 0–1 based on incidents
  const riskScore = Math.min(incidentCount / 50, 1);
  const riskLevel =
    riskScore < 0.2 ? 'safe' :
    riskScore < 0.4 ? 'low' :
    riskScore < 0.6 ? 'moderate' :
    riskScore < 0.8 ? 'high' : 'critical';

  return {
    riskScore: parseFloat(riskScore.toFixed(3)),
    riskLevel,
    recentIncidents: incidentCount,
    safeZonesNearby: safeZoneCount,
    hotspots,
    radiusKm,
    center: { latitude, longitude },
  };
}
