import { OrganizationStatus, OrganizationType, Prisma, UserRole, VerificationStatus, VolunteerStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { createAuditLog } from '../utils/createAuditLog';
import { haversineDistance } from '../utils/haversine';

type CoverageArea = {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  name: string;
};

const SOS_RESPOND_ACTION = 'VOLUNTEER_RESPONDING_SOS';
const SOS_CLOSE_ACTION = 'VOLUNTEER_CLOSED_SOS';
const CASE_ASSIGN_ACTION = 'NGO_ASSIGNED_INCIDENT';
const CASE_CLOSE_ACTION = 'VOLUNTEER_CLOSED_CASE';
const CHECK_IN_ACTION = 'VOLUNTEER_CHECK_IN';
const STANDALONE_CHECK_IN_ACTION = 'VOLUNTEER_STANDALONE_CHECK_IN';

export async function getNavigationMeta(volunteerUserId: string) {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const coverage = await getVolunteerCoverageAreas(volunteerUserId, volunteer.ngoOrganizationId);
  const alerts = await getScopedSosAlerts(coverage, volunteerUserId);

  return {
    volunteerName: volunteer.fullName,
    ngoName: volunteer.ngoName,
    liveSosCount: alerts.filter((alert) => alert.status !== 'CLOSED').length,
    roomIds: coverage.map((area) => buildNgoCoverageRoom(area.id)),
  };
}

export async function getOverview(volunteerUserId: string) {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const coverage = await getVolunteerCoverageAreas(volunteerUserId, volunteer.ngoOrganizationId);
  const [cases, alerts, checkIns, recentActivity] = await Promise.all([
    listCases(volunteerUserId),
    getScopedSosAlerts(coverage, volunteerUserId),
    getCheckInHistory(volunteerUserId),
    getRecentActivity(volunteerUserId),
  ]);

  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  const latestCheckIn = checkIns[0] ?? null;

  return {
    ngoName: volunteer.ngoName,
    metrics: [
      { label: 'Active case assignments', value: cases.length },
      { label: 'SOS nearby in 24h', value: alerts.filter((alert) => new Date(alert.createdAt).getTime() >= last24Hours).length },
      { label: 'Total cases handled', value: await getHandledCaseCount(volunteerUserId) },
      { label: 'Last check-in', value: latestCheckIn ? new Date(latestCheckIn.createdAt).toLocaleString() : 'No check-in yet' },
    ],
    map: {
      center: resolveCoverageCenter(coverage),
      coverage: coverage.map((area) => ({
        id: area.id,
        name: area.name,
        latitude: area.latitude,
        longitude: area.longitude,
        radiusMeters: area.radiusMeters,
      })),
      lastCheckIn: latestCheckIn
        ? {
            latitude: latestCheckIn.latitude,
            longitude: latestCheckIn.longitude,
            createdAt: latestCheckIn.createdAt,
          }
        : null,
    },
    recentActivity,
  };
}

export async function listSos(volunteerUserId: string) {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const coverage = await getVolunteerCoverageAreas(volunteerUserId, volunteer.ngoOrganizationId);
  return getScopedSosAlerts(coverage, volunteerUserId);
}

export async function respondSos(volunteerUserId: string, alertId: string) {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const coverage = await getVolunteerCoverageAreas(volunteerUserId, volunteer.ngoOrganizationId);
  const alerts = await getScopedSosAlerts(coverage, volunteerUserId);
  const alert = alerts.find((item) => item.id === alertId);
  if (!alert) throw new AppError('SOS alert not found in your NGO coverage area', 404);

  await createAuditLog(volunteerUserId, SOS_RESPOND_ACTION, alertId, {
    volunteerId: volunteerUserId,
    volunteerName: volunteer.fullName,
  }, 'SosAlert');

  return { success: true };
}

export async function closeSos(volunteerUserId: string, alertId: string) {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const coverage = await getVolunteerCoverageAreas(volunteerUserId, volunteer.ngoOrganizationId);
  const alerts = await getScopedSosAlerts(coverage, volunteerUserId);
  const alert = alerts.find((item) => item.id === alertId);
  if (!alert) throw new AppError('SOS alert not found in your NGO coverage area', 404);

  await createAuditLog(volunteerUserId, SOS_CLOSE_ACTION, alertId, {
    volunteerId: volunteerUserId,
    volunteerName: volunteer.fullName,
  }, 'SosAlert');

  return { success: true };
}

export async function listCases(volunteerUserId: string) {
  const history = await getVolunteerCaseEvents(volunteerUserId);
  return history.filter((item) => item.status === 'ACTIVE');
}

export async function listCaseHistory(volunteerUserId: string) {
  const history = await getVolunteerCaseEvents(volunteerUserId);
  return history.filter((item) => item.status === 'CLOSED');
}

export async function checkInCase(volunteerUserId: string, caseId: string, input: { lat: number; lng: number; note?: string }) {
  const activeCases = await listCases(volunteerUserId);
  const target = activeCases.find((item) => item.id === caseId);
  if (!target) throw new AppError('Case not assigned to this volunteer', 404);

  await createAuditLog(volunteerUserId, CHECK_IN_ACTION, caseId, {
    latitude: input.lat,
    longitude: input.lng,
    note: input.note ?? null,
    caseType: target.type,
  }, 'CommunityReport');

  return {
    caseId,
    checkedInAt: new Date().toISOString(),
  };
}

export async function closeCase(volunteerUserId: string, caseId: string) {
  const activeCases = await listCases(volunteerUserId);
  const target = activeCases.find((item) => item.id === caseId);
  if (!target) throw new AppError('Case not assigned to this volunteer', 404);

  await createAuditLog(volunteerUserId, CASE_CLOSE_ACTION, caseId, {
    volunteerId: volunteerUserId,
    volunteerName: (await getVolunteerContext(volunteerUserId)).fullName,
    caseType: target.type,
  }, 'CommunityReport');

  return { success: true };
}

export async function getIncidentMap(volunteerUserId: string, days = 7) {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const coverage = await getVolunteerCoverageAreas(volunteerUserId, volunteer.ngoOrganizationId);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const reports = await prisma.communityReport.findMany({
    where: {
      isActive: true,
      createdAt: { gte: cutoff },
    },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      latitude: true,
      longitude: true,
      pinColor: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const center = resolveCoverageCenter(coverage);
  return reports
    .filter((report) => isWithinCoverage(coverage, report.latitude, report.longitude))
    .map((report) => ({
      id: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      type: report.title ?? String(report.category).replace(/_/g, ' '),
      severity: pinColorToSeverity(report.pinColor),
      timestamp: report.createdAt.toISOString(),
      description: report.description ?? '',
      distanceKm: haversineDistance(center.latitude, center.longitude, report.latitude, report.longitude),
    }));
}

export async function createStandaloneCheckIn(volunteerUserId: string, input: { lat: number; lng: number; note?: string }) {
  await createAuditLog(volunteerUserId, STANDALONE_CHECK_IN_ACTION, volunteerUserId, {
    latitude: input.lat,
    longitude: input.lng,
    note: input.note ?? null,
  }, 'User');

  return {
    checkedInAt: new Date().toISOString(),
    latitude: input.lat,
    longitude: input.lng,
    note: input.note ?? null,
  };
}

export async function getCheckInHistory(volunteerUserId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      actorId: volunteerUserId,
      action: { in: [CHECK_IN_ACTION, STANDALONE_CHECK_IN_ACTION] },
    },
    select: { id: true, action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return logs.map((item) => ({
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    latitude: readJsonNumber(item.metadata, 'latitude') ?? 0,
    longitude: readJsonNumber(item.metadata, 'longitude') ?? 0,
    note: readJsonString(item.metadata, 'note'),
    kind: item.action === CHECK_IN_ACTION ? 'CASE' : 'STANDALONE',
  }));
}

export async function getZones(volunteerUserId: string) {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const coverage = await getVolunteerCoverageAreas(volunteerUserId, volunteer.ngoOrganizationId);
  const center = resolveCoverageCenter(coverage);

  const [safeZones, redZones] = await Promise.all([
    prisma.safeZone.findMany({
      where: {
        isActive: true,
        department: { organizationType: OrganizationType.police },
      },
      select: {
        id: true,
        name: true,
        type: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.redZone.findMany({
      select: {
        id: true,
        description: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { triggeredAt: 'desc' },
      take: 100,
    }),
  ]);

  return [
    ...safeZones
      .filter((zone) => haversineDistance(center.latitude, center.longitude, zone.latitude, zone.longitude) <= 20)
      .map((zone) => ({
        id: zone.id,
        name: zone.name,
        type: zone.type.toUpperCase() === 'RED' ? 'RED' : 'SAFE',
        latitude: zone.latitude,
        longitude: zone.longitude,
        radiusMeters: zone.radiusMeters ?? 1000,
        description: zone.address ?? '',
      })),
    ...redZones
      .filter((zone) => haversineDistance(center.latitude, center.longitude, zone.latitude, zone.longitude) <= 20)
      .map((zone) => ({
        id: zone.id,
        name: zone.description.slice(0, 48) || 'RedZone',
        type: 'RED',
        latitude: zone.latitude,
        longitude: zone.longitude,
        radiusMeters: 1000,
        description: zone.description,
      })),
  ];
}

async function getVolunteerContext(volunteerUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: volunteerUserId },
    select: {
      id: true,
      fullName: true,
      ngoId: true,
      ngo: { select: { fullName: true } },
      volunteerProfile: { select: { id: true } },
    },
  });
  if (!user || !user.ngoId) throw new AppError('Volunteer NGO association not found', 404);

  if (!user.volunteerProfile?.id) {
    await prisma.volunteer.create({
      data: {
        userId: user.id,
        status: VolunteerStatus.offline,
        verificationStatus: VerificationStatus.verified,
        ngoAffiliation: user.ngo?.fullName ?? 'NGO',
        skills: [],
        languagesSpoken: [],
        serviceRadiusKm: 5,
        aadhaarVerified: true,
      },
    });
  }

  let organization = await prisma.organization.findFirst({
    where: {
      createdById: user.ngoId,
      organizationType: OrganizationType.ngo,
    },
    select: { id: true, organizationName: true },
  });
  if (!organization) {
    const ngoOwner = await prisma.user.findUnique({
      where: { id: user.ngoId },
      select: { fullName: true, email: true },
    });
    if (!ngoOwner) throw new AppError('NGO organization not found', 404);

    organization = await prisma.organization.create({
      data: {
        organizationName: ngoOwner.fullName,
        organizationType: OrganizationType.ngo,
        email: ngoOwner.email,
        status: OrganizationStatus.approved,
        createdById: user.ngoId,
        approvedAt: new Date(),
      },
      select: { id: true, organizationName: true },
    });
  }

  return {
    id: user.id,
    fullName: user.fullName,
    ngoOwnerId: user.ngoId,
    ngoName: organization.organizationName || user.ngo?.fullName || 'NGO',
    ngoOrganizationId: organization.id,
    volunteerProfileId: user.volunteerProfile?.id ?? null,
  };
}

async function getVolunteerCoverageAreas(volunteerUserId: string, ngoOrganizationId: string): Promise<CoverageArea[]> {
  const volunteer = await getVolunteerContext(volunteerUserId);
  const [zones, locations] = await Promise.all([
    prisma.safeZone.findMany({
      where: {
        departmentId: ngoOrganizationId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        radiusMeters: true,
      },
    }),
    prisma.userLocation.findMany({
      where: {
        user: {
          ngoId: volunteer.ngoOwnerId,
          role: UserRole.VOLUNTEER,
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: 5,
      select: { id: true, latitude: true, longitude: true },
    }),
  ]);

  if (zones.length) {
    return zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusMeters: zone.radiusMeters ?? 5000,
    }));
  }

  if (locations.length) {
    return locations.map((location, index) => ({
      id: `ngo-fallback-${index}`,
      name: 'NGO coverage',
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 5000,
    }));
  }

  return [{
    id: `ngo-${ngoOrganizationId}`,
    name: 'NGO coverage',
    latitude: 20.5937,
    longitude: 78.9629,
    radiusMeters: 5000,
  }];
}

async function getScopedSosAlerts(coverage: CoverageArea[], volunteerUserId: string) {
  const alerts = await prisma.sosAlert.findMany({
    where: {
      triggerLatitude: { not: null },
      triggerLongitude: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      alertCode: true,
      triggerLatitude: true,
      triggerLongitude: true,
      createdAt: true,
      user: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'SosAlert',
      entityId: { in: alerts.map((alert) => alert.id) },
      action: { in: [SOS_RESPOND_ACTION, SOS_CLOSE_ACTION] },
    },
    select: { entityId: true, action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const actionMap = new Map<string, { status: 'PENDING' | 'RESPONDING' | 'CLOSED'; volunteerId?: string | null }>();
  logs.forEach((log) => {
    if (!log.entityId || actionMap.has(log.entityId)) return;
    actionMap.set(log.entityId, {
      status: log.action === SOS_CLOSE_ACTION ? 'CLOSED' : 'RESPONDING',
      volunteerId: readJsonString(log.metadata, 'volunteerId'),
    });
  });

  const lastCheckIn = (await getCheckInHistory(volunteerUserId))[0] ?? null;

  return alerts
    .filter((alert) => isWithinCoverage(coverage, alert.triggerLatitude ?? 0, alert.triggerLongitude ?? 0))
    .map((alert) => ({
      id: alert.id,
      alertCode: alert.alertCode,
      userName: alert.user.fullName || 'Anonymous',
      latitude: alert.triggerLatitude ?? 0,
      longitude: alert.triggerLongitude ?? 0,
      createdAt: alert.createdAt.toISOString(),
      status: actionMap.get(alert.id)?.status ?? 'PENDING',
      distanceKm: lastCheckIn
        ? haversineDistance(lastCheckIn.latitude, lastCheckIn.longitude, alert.triggerLatitude ?? 0, alert.triggerLongitude ?? 0)
        : null,
      mine: actionMap.get(alert.id)?.volunteerId === volunteerUserId,
    }));
}

async function getVolunteerCaseEvents(volunteerUserId: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: [CASE_ASSIGN_ACTION, CASE_CLOSE_ACTION] },
      OR: [
        { metadata: { path: ['volunteerId'], equals: volunteerUserId } },
        { actorId: volunteerUserId, action: CASE_CLOSE_ACTION },
      ],
    },
    select: { entityId: true, action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const state = new Map<string, { assignedAt: string; closedAt?: string | null; type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; location: string; status: 'ACTIVE' | 'CLOSED' }>();

  logs.forEach((log) => {
    if (!log.entityId) return;
    const existing = state.get(log.entityId);
    if (log.action === CASE_CLOSE_ACTION) {
      if (existing) {
        existing.status = 'CLOSED';
        existing.closedAt = log.createdAt.toISOString();
      } else {
        state.set(log.entityId, {
          assignedAt: log.createdAt.toISOString(),
          closedAt: log.createdAt.toISOString(),
          type: readJsonString(log.metadata, 'caseType') ?? 'Case',
          severity: 'MEDIUM',
          location: 'Assigned by NGO',
          status: 'CLOSED',
        });
      }
      return;
    }

    if (!existing) {
      state.set(log.entityId, {
        assignedAt: log.createdAt.toISOString(),
        type: readJsonString(log.metadata, 'incidentType') ?? 'Case',
        severity: 'MEDIUM',
        location: 'Assigned by NGO',
        status: 'ACTIVE',
      });
    }
  });

  return [...state.entries()].map(([id, item]) => ({
    id,
    type: item.type,
    severity: item.severity,
    location: item.location,
    assignedAt: item.assignedAt,
    closedAt: item.closedAt ?? null,
    status: item.status,
  }));
}

async function getHandledCaseCount(volunteerUserId: string) {
  const history = await listCaseHistory(volunteerUserId);
  return history.length;
}

async function getRecentActivity(volunteerUserId: string) {
  const [sos, cases] = await Promise.all([
    listSos(volunteerUserId),
    listCases(volunteerUserId),
  ]);

  return [
    ...sos.slice(0, 5).map((alert) => ({
      id: `sos-${alert.id}`,
      type: 'SOS',
      title: `${alert.userName} SOS alert`,
      subtitle: `${alert.status} near ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`,
      createdAt: alert.createdAt,
    })),
    ...cases.slice(0, 5).map((item) => ({
      id: `case-${item.id}`,
      type: 'CASE',
      title: item.type,
      subtitle: `${item.status} • assigned ${new Date(item.assignedAt).toLocaleString()}`,
      createdAt: item.assignedAt,
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5);
}

function resolveCoverageCenter(coverage: CoverageArea[]) {
  const latitude = coverage.reduce((sum, area) => sum + area.latitude, 0) / coverage.length;
  const longitude = coverage.reduce((sum, area) => sum + area.longitude, 0) / coverage.length;
  return { latitude, longitude };
}

function isWithinCoverage(coverage: CoverageArea[], latitude: number, longitude: number) {
  return coverage.some((area) => haversineDistance(area.latitude, area.longitude, latitude, longitude) * 1000 <= area.radiusMeters);
}

function pinColorToSeverity(color: string) {
  if (color === 'red') return 'HIGH';
  if (color === 'yellow') return 'MEDIUM';
  return 'LOW';
}

function buildNgoCoverageRoom(id: string) {
  return `ngo-zone:${id}`;
}

function readJsonString(value: Prisma.JsonValue | null | undefined, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = (value as Record<string, Prisma.JsonValue>)[key];
  return typeof raw === 'string' ? raw : null;
}

function readJsonNumber(value: Prisma.JsonValue | null | undefined, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = (value as Record<string, Prisma.JsonValue>)[key];
  return typeof raw === 'number' ? raw : null;
}
