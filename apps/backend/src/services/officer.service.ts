import { Prisma, ReportCategory, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { createAuditLog } from '../utils/createAuditLog';
import { haversineDistance } from '../utils/haversine';
import { emitOfficerScopedSOSCreated } from '../sockets';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH';

const DEFAULT_HOTSPOT_RADIUS_METERS = 1200;

export async function getNavigationMeta(officerUserId: string) {
  const officer = await getOfficerProfile(officerUserId);
  const hotspot = await getAssignedHotspot(officerUserId);
  const alerts = hotspot ? await getScopedSosForHotspot(hotspot) : [];

  return {
    officerName: officer.fullName,
    badgeNumber: officer.badgeNumber ?? 'Badge pending',
    liveSosCount: alerts.filter((alert) => alert.status !== 'RESOLVED').length,
    roomIds: hotspot ? [buildOfficerHotspotRoom(hotspot.id)] : [],
  };
}

export async function getOverview(officerUserId: string) {
  const [officer, hotspot, resolvedCount] = await Promise.all([
    getOfficerProfile(officerUserId),
    getAssignedHotspot(officerUserId),
    prisma.auditLog.count({
      where: { actorId: officerUserId, action: 'OFFICER_RESOLVED_INCIDENT' },
    }),
  ]);

  if (!hotspot) {
    return {
      assignment: null,
      metrics: [
        { label: 'SOS in zone today', value: 0 },
        { label: 'Open incidents in zone', value: 0 },
        { label: 'Total resolved', value: resolvedCount },
        { label: 'Department', value: officer.departmentName ?? 'Unassigned' },
      ],
      map: null,
    };
  }

  const [alerts, incidents] = await Promise.all([
    getScopedSosForHotspot(hotspot),
    getScopedIncidentsForHotspot(hotspot, 5),
  ]);
  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;

  return {
    assignment: {
      name: hotspot.name,
      severity: hotspot.severity,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      radiusMeters: hotspot.radiusMeters,
    },
    metrics: [
      { label: 'SOS in zone today', value: alerts.filter((alert) => new Date(alert.createdAt).getTime() >= last24Hours).length },
      { label: 'Open incidents in zone', value: incidents.filter((incident) => incident.status === 'OPEN').length },
      { label: 'Total resolved', value: resolvedCount },
      { label: 'Department', value: officer.departmentName ?? 'Department' },
    ],
    map: {
      center: { latitude: hotspot.latitude, longitude: hotspot.longitude },
      radiusMeters: hotspot.radiusMeters,
      incidents: incidents.map((incident) => ({
        id: incident.id,
        latitude: incident.latitude,
        longitude: incident.longitude,
        severity: incident.severity,
        type: incident.type,
        status: incident.status,
      })),
    },
  };
}

export async function getHotspot(officerUserId: string) {
  const hotspot = await getAssignedHotspot(officerUserId);
  if (!hotspot) {
    return null;
  }

  const [assignmentHistory, incidents] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: { in: ['DEPARTMENT_ASSIGNED_HOTSPOT', 'DEPARTMENT_UNASSIGNED_HOTSPOT'] },
        metadata: { path: ['officerId'], equals: officerUserId },
      },
      select: { id: true, action: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    getScopedIncidentsForHotspot(hotspot, hotspot.radiusMeters / 1000),
  ]);

  return {
    ...hotspot,
    assignmentHistory: assignmentHistory.map((item) => ({
      id: item.id,
      action: item.action,
      hotspotName: readJsonString(item.metadata, 'hotspotName'),
      createdAt: item.createdAt.toISOString(),
    })),
    incidents,
  };
}

export async function listSos(officerUserId: string) {
  const hotspot = await getAssignedHotspot(officerUserId);
  if (!hotspot) return [];
  return getScopedSosForHotspot(hotspot);
}

export async function acknowledgeSos(officerUserId: string, alertId: string) {
  const hotspot = await getAssignedHotspot(officerUserId);
  if (!hotspot) throw new AppError('No assigned hotspot', 400);
  const alerts = await getScopedSosForHotspot(hotspot);
  const alert = alerts.find((item) => item.id === alertId);
  if (!alert) throw new AppError('SOS alert not found in your assigned zone', 404);

  await prisma.alertStatusHistory.create({
    data: {
      alertId,
      changedById: officerUserId,
      changedByRole: UserRole.POLICEMAN,
      oldStatus: 'pending',
      newStatus: 'accepted',
      notes: 'Officer acknowledged alert',
    },
  });

  await createAuditLog(officerUserId, 'OFFICER_ACKNOWLEDGED_SOS', alertId, {
    hotspotId: hotspot.id,
    hotspotName: hotspot.name,
  }, 'SosAlert');

  return { success: true };
}

export async function resolveSos(officerUserId: string, alertId: string) {
  const hotspot = await getAssignedHotspot(officerUserId);
  if (!hotspot) throw new AppError('No assigned hotspot', 400);
  const alerts = await getScopedSosForHotspot(hotspot);
  const alert = alerts.find((item) => item.id === alertId);
  if (!alert) throw new AppError('SOS alert not found in your assigned zone', 404);

  await prisma.alertStatusHistory.create({
    data: {
      alertId,
      changedById: officerUserId,
      changedByRole: UserRole.POLICEMAN,
      oldStatus: 'accepted',
      newStatus: 'resolved',
      notes: 'Officer resolved alert',
    },
  });

  await createAuditLog(officerUserId, 'OFFICER_RESOLVED_SOS', alertId, {
    hotspotId: hotspot.id,
    hotspotName: hotspot.name,
  }, 'SosAlert');

  return { success: true };
}

export async function listIncidents(officerUserId: string, radiusKm = 5) {
  const hotspot = await getAssignedHotspot(officerUserId);
  if (!hotspot) return [];
  return getScopedIncidentsForHotspot(hotspot, radiusKm);
}

export async function resolveIncident(officerUserId: string, incidentId: string) {
  const hotspot = await getAssignedHotspot(officerUserId);
  if (!hotspot) throw new AppError('No assigned hotspot', 400);
  const incidents = await getScopedIncidentsForHotspot(hotspot, hotspot.radiusMeters / 1000);
  const incident = incidents.find((item) => item.id === incidentId);
  if (!incident) throw new AppError('Incident not found in your zone', 404);

  await prisma.communityReport.update({
    where: { id: incidentId },
    data: { isActive: false },
  });
  await createAuditLog(officerUserId, 'OFFICER_RESOLVED_INCIDENT', incidentId, {
    hotspotId: hotspot.id,
    hotspotName: hotspot.name,
    incidentType: incident.type,
  }, 'CommunityReport');

  return { success: true };
}

export async function createIncident(
  officerUserId: string,
  input: { type: ReportCategory; description: string; lat: number; lng: number; severity: Severity; evidenceUrl?: string }
) {
  const report = await prisma.communityReport.create({
    data: {
      reporterId: officerUserId,
      isAnonymous: false,
      category: input.type,
      title: String(input.type).replace(/_/g, ' '),
      description: input.description,
      latitude: input.lat,
      longitude: input.lng,
      imageUrls: input.evidenceUrl ? [input.evidenceUrl] : [],
      pinColor: severityToPinColor(input.severity),
      score: severityToScore(input.severity),
      isActive: true,
    },
  });

  await createAuditLog(officerUserId, 'OFFICER_SUBMITTED_INCIDENT_REPORT', report.id, {
    type: input.type,
    severity: input.severity,
    evidenceUrl: input.evidenceUrl ?? null,
  }, 'CommunityReport');

  return report;
}

async function getOfficerProfile(officerUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id: officerUserId },
    select: {
      id: true,
      fullName: true,
      email: true,
      departmentId: true,
      policeDepartment: { select: { fullName: true } },
      workerProfile: { select: { id: true } },
    },
  });
  if (!user || !user.workerProfile?.id) throw new AppError('Officer profile not found', 404);

  const createdLog = await prisma.auditLog.findFirst({
    where: { entityId: officerUserId, action: 'CREATED_POLICEMAN' },
    select: { metadata: true },
    orderBy: { createdAt: 'desc' },
  });

  return {
    ...user,
    badgeNumber: readJsonString(createdLog?.metadata, 'badgeNumber'),
    departmentName: user.policeDepartment?.fullName ?? null,
    workerId: user.workerProfile.id,
  };
}

async function getAssignedHotspot(officerUserId: string) {
  const officer = await getOfficerProfile(officerUserId);
  const hotspot = await prisma.safetyHotspot.findFirst({
    where: { assignedPolicemanId: officer.workerId, isActive: true },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      riskScore: true,
      isActive: true,
      assignedAt: true,
    },
    orderBy: { assignedAt: 'desc' },
  });
  if (!hotspot) return null;

  const metadata = await prisma.auditLog.findFirst({
    where: {
      entityId: hotspot.id,
      entityType: 'SafetyHotspot',
      action: { in: ['DEPARTMENT_CREATED_HOTSPOT', 'DEPARTMENT_UPDATED_HOTSPOT'] },
    },
    select: { metadata: true },
    orderBy: { createdAt: 'desc' },
  });

  return {
    id: hotspot.id,
    name: hotspot.title ?? 'Department hotspot',
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    radiusMeters: readJsonNumber(metadata?.metadata, 'radiusMeters') ?? DEFAULT_HOTSPOT_RADIUS_METERS,
    severity: (readJsonString(metadata?.metadata, 'severity') as Severity | null) ?? riskScoreToSeverity(Number(hotspot.riskScore)),
    status: hotspot.isActive ? 'ACTIVE' : 'INACTIVE',
  };
}

async function getScopedSosForHotspot(hotspot: NonNullable<Awaited<ReturnType<typeof getAssignedHotspot>>>) {
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

  const actions = await prisma.auditLog.findMany({
    where: {
      entityType: 'SosAlert',
      entityId: { in: alerts.map((alert) => alert.id) },
      action: { in: ['OFFICER_ACKNOWLEDGED_SOS', 'OFFICER_RESOLVED_SOS'] },
    },
    select: { entityId: true, action: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const statusMap = new Map<string, 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'>();
  actions.forEach((item) => {
    if (!item.entityId || statusMap.has(item.entityId)) return;
    statusMap.set(item.entityId, item.action === 'OFFICER_RESOLVED_SOS' ? 'RESOLVED' : 'ACKNOWLEDGED');
  });

  return alerts
    .filter((alert) => haversineDistance(hotspot.latitude, hotspot.longitude, alert.triggerLatitude ?? 0, alert.triggerLongitude ?? 0) * 1000 <= hotspot.radiusMeters)
    .map((alert) => ({
      id: alert.id,
      alertCode: alert.alertCode,
      userName: alert.user.fullName || 'Anonymous',
      latitude: alert.triggerLatitude ?? 0,
      longitude: alert.triggerLongitude ?? 0,
      createdAt: alert.createdAt.toISOString(),
      status: statusMap.get(alert.id) ?? 'PENDING',
    }));
}

async function getScopedIncidentsForHotspot(hotspot: NonNullable<Awaited<ReturnType<typeof getAssignedHotspot>>>, radiusKm: number) {
  const reports = await prisma.communityReport.findMany({
    where: {
      latitude: { not: undefined },
      longitude: { not: undefined },
    },
    select: {
      id: true,
      title: true,
      category: true,
      latitude: true,
      longitude: true,
      description: true,
      score: true,
      createdAt: true,
      pinColor: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return reports
    .filter((report) => haversineDistance(hotspot.latitude, hotspot.longitude, report.latitude, report.longitude) <= radiusKm)
    .map((report) => ({
      id: report.id,
      type: report.title ?? String(report.category).replace(/_/g, ' '),
      severity: pinColorToSeverity(report.pinColor),
      latitude: report.latitude,
      longitude: report.longitude,
      description: report.description ?? '',
      pinScore: report.score,
      timestamp: report.createdAt.toISOString(),
      status: report.isActive ? 'OPEN' : 'RESOLVED',
    }));
}

function riskScoreToSeverity(score: number): Severity {
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

function pinColorToSeverity(color: string): Severity {
  if (color === 'red') return 'HIGH';
  if (color === 'yellow') return 'MEDIUM';
  return 'LOW';
}

function severityToPinColor(severity: Severity) {
  if (severity === 'HIGH') return 'red';
  if (severity === 'MEDIUM') return 'yellow';
  return 'white';
}

function severityToScore(severity: Severity) {
  if (severity === 'HIGH') return 8;
  if (severity === 'MEDIUM') return 5;
  return 2;
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

function buildOfficerHotspotRoom(hotspotId: string) {
  return `officer-hotspot:${hotspotId}`;
}

export async function emitOfficerScopedSosNotification(alertId: string, latitude: number, longitude: number) {
  const hotspots = await prisma.safetyHotspot.findMany({
    where: { isActive: true, assignedPolicemanId: { not: null } },
    select: { id: true, latitude: true, longitude: true },
  });

  const metadataLogs = await prisma.auditLog.findMany({
    where: {
      entityType: 'SafetyHotspot',
      entityId: { in: hotspots.map((hotspot) => hotspot.id) },
      action: { in: ['DEPARTMENT_CREATED_HOTSPOT', 'DEPARTMENT_UPDATED_HOTSPOT'] },
    },
    select: { entityId: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const radiusMap = new Map<string, number>();
  metadataLogs.forEach((log) => {
    if (!log.entityId || radiusMap.has(log.entityId)) return;
    radiusMap.set(log.entityId, readJsonNumber(log.metadata, 'radiusMeters') ?? DEFAULT_HOTSPOT_RADIUS_METERS);
  });

  const roomIds = hotspots
    .filter((hotspot) => haversineDistance(hotspot.latitude, hotspot.longitude, latitude, longitude) * 1000 <= (radiusMap.get(hotspot.id) ?? DEFAULT_HOTSPOT_RADIUS_METERS))
    .map((hotspot) => buildOfficerHotspotRoom(hotspot.id));

  if (roomIds.length) {
    emitOfficerScopedSOSCreated([...new Set(roomIds)], { alertId, latitude, longitude });
  }
}
