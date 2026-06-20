import { AlertStatus, OrganizationStatus, OrganizationType, Prisma, ReportCategory, UserRole, WorkerType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import * as HierarchyService from './hierarchy.service';
import { createAuditLog } from '../utils/createAuditLog';
import { haversineDistance } from '../utils/haversine';
import { emitDepartmentScopedSOSCreated } from '../sockets';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
type ZoneType = 'SAFE' | 'RED';

type CoverageArea = {
  id: string;
  source: 'zone' | 'hotspot';
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  severity?: Severity;
  type?: ZoneType;
  assignedOfficer?: string | null;
};

const HOTSPOT_DEFAULT_RADIUS_METERS = 1200;
const FALLBACK_INCIDENT_RADIUS_KM = 50;
const INDIA_CENTER = { latitude: 20.5937, longitude: 78.9629 };
const HOTSPOT_METADATA_ACTIONS = [
  'DEPARTMENT_CREATED_HOTSPOT',
  'DEPARTMENT_UPDATED_HOTSPOT',
  'DEPARTMENT_ASSIGNED_HOTSPOT',
  'DEPARTMENT_UNASSIGNED_HOTSPOT',
];

export async function getNavigationMeta(departmentUserId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const zones = await getDepartmentZones(organization.id);
  const coverage = await getDepartmentCoverageAreas(departmentUserId, organization.id);
  const alerts = await getScopedAlerts(coverage);

  return {
    departmentName: organization.organizationName,
    liveSosCount: alerts.filter((alert) => alert.status !== AlertStatus.resolved).length,
    roomIds: zones.map((zone) => buildDepartmentZoneRoom(zone.id)),
  };
}

export async function getOverview(departmentUserId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const [policemen, hotspots, coverage, incidentResult, alerts, activity] = await Promise.all([
    listPolicemen(departmentUserId),
    listHotspots(departmentUserId),
    getDepartmentCoverageAreas(departmentUserId, organization.id),
    listIncidents(departmentUserId),
    getScopedAlerts(await getDepartmentCoverageAreas(departmentUserId, organization.id)),
    getRecentDepartmentActivity(departmentUserId, 10),
  ]);
  const incidents = incidentResult.items;

  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    metrics: [
      { label: 'Policemen', value: policemen.length },
      { label: 'Active assignments', value: hotspots.filter((hotspot) => hotspot.assignedOfficer).length },
      { label: 'SOS in 24h', value: alerts.filter((alert) => new Date(alert.createdAt).getTime() >= last24Hours).length },
      { label: 'SOS in 7d', value: alerts.filter((alert) => new Date(alert.createdAt).getTime() >= last7Days).length },
      { label: 'Incidents in 7d', value: incidents.filter((incident) => new Date(incident.timestamp).getTime() >= last7Days).length },
      { label: 'Unacknowledged SOS', value: alerts.filter((alert) => alert.status === 'PENDING').length },
    ],
    map: {
      center: resolveMapCenter(coverage),
      hotspots: coverage.map((item) => ({
        id: item.id,
        name: item.name,
        latitude: item.latitude,
        longitude: item.longitude,
        radiusMeters: item.radiusMeters,
        severity: item.severity ?? 'MEDIUM',
        assignedOfficer: item.assignedOfficer ?? null,
      })),
    },
    recentActivity: activity,
  };
}

export async function createPoliceman(departmentUserId: string, input: Parameters<typeof HierarchyService.createPoliceman>[1]) {
  return HierarchyService.createPoliceman(departmentUserId, input);
}

export async function listPolicemen(departmentUserId: string) {
  const policemen = await prisma.user.findMany({
    where: {
      role: UserRole.POLICEMAN,
      departmentId: departmentUserId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      workerProfile: {
        select: {
          id: true,
          customRole: true,
          assignedHotspots: {
            where: { isActive: true },
            select: { id: true, title: true, latitude: true, longitude: true, assignedAt: true },
            take: 1,
            orderBy: { assignedAt: 'desc' },
          },
        },
      },
      auditLogs: {
        where: {
          action: { in: ['DEPARTMENT_ACKNOWLEDGED_SOS', 'DEPARTMENT_RESOLVED_SOS'] },
        },
        select: { id: true },
      },
      createdBy: {
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return policemen.map((officer) => ({
    id: officer.id,
    fullName: officer.fullName,
    email: officer.email,
    isActive: officer.isActive,
    mustChangePassword: officer.mustChangePassword,
    badgeNumber: officer.workerProfile?.customRole ?? null,
    currentHotspot: officer.workerProfile?.assignedHotspots[0]
      ? {
          id: officer.workerProfile.assignedHotspots[0].id,
          name: officer.workerProfile.assignedHotspots[0].title ?? 'Department hotspot',
        }
      : null,
    recentResponseCount: officer.auditLogs.length,
  }));
}

export async function setPolicemanActiveState(departmentUserId: string, policemanId: string, isActive: boolean) {
  const policeman = await ensureDepartmentPoliceman(departmentUserId, policemanId);

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: policeman.id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
      },
    });

    if (policeman.workerProfile?.id) {
      await tx.worker.update({
        where: { id: policeman.workerProfile.id },
        data: { isActive },
      });
    }

    await createAuditLog(
      departmentUserId,
      isActive ? 'DEPARTMENT_REACTIVATED_POLICEMAN' : 'DEPARTMENT_DEACTIVATED_POLICEMAN',
      policeman.id,
      { officerName: policeman.fullName, email: policeman.email },
      'User',
      tx
    );

    return user;
  });

  return updated;
}

export async function getPolicemanDetail(departmentUserId: string, policemanId: string) {
  const policeman = await ensureDepartmentPoliceman(departmentUserId, policemanId);
  const [responses, assignments] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: { in: ['DEPARTMENT_ACKNOWLEDGED_SOS', 'DEPARTMENT_RESOLVED_SOS'] },
        metadata: {
          path: ['officerId'],
          equals: policemanId,
        },
      },
      select: {
        id: true,
        action: true,
        entityId: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.auditLog.findMany({
      where: {
        action: { in: ['DEPARTMENT_ASSIGNED_HOTSPOT', 'DEPARTMENT_UNASSIGNED_HOTSPOT'] },
        metadata: {
          path: ['officerId'],
          equals: policemanId,
        },
      },
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    id: policeman.id,
    fullName: policeman.fullName,
    email: policeman.email,
    isActive: policeman.isActive,
    mustChangePassword: policeman.mustChangePassword,
    currentHotspot: policeman.workerProfile?.assignedHotspots[0]
      ? {
          id: policeman.workerProfile.assignedHotspots[0].id,
          name: policeman.workerProfile.assignedHotspots[0].title ?? 'Department hotspot',
          assignedAt: policeman.workerProfile.assignedHotspots[0].assignedAt,
        }
      : null,
    responseCount: responses.length,
    responses: responses.map((item) => ({
      id: item.id,
      action: item.action,
      alertId: item.entityId,
      createdAt: item.createdAt,
      notes: readJsonString(item.metadata, 'notes'),
    })),
    assignmentHistory: assignments.map((item) => ({
      id: item.id,
      action: item.action,
      hotspotName: readJsonString(item.metadata, 'hotspotName'),
      createdAt: item.createdAt,
    })),
  };
}

export async function listHotspots(departmentUserId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const createdHotspotIds = await getDepartmentCreatedHotspotIds(departmentUserId);
  const metadataMap = await getHotspotMetadataMap(createdHotspotIds);

  const hotspots = await prisma.safetyHotspot.findMany({
    where: {
      OR: [
        { id: { in: createdHotspotIds } },
        { assignedPoliceman: { organizationId: organization.id } },
      ],
    },
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      riskScore: true,
      isActive: true,
      reportCount: true,
      updatedAt: true,
      assignedPoliceman: {
        select: {
          id: true,
          user: { select: { id: true, fullName: true, isActive: true } },
        },
      },
      communityReports: {
        select: { id: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return hotspots.map((hotspot) => {
    const metadata = metadataMap.get(hotspot.id);
    return {
      id: hotspot.id,
      name: hotspot.title ?? metadata?.name ?? 'Department hotspot',
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      radiusMeters: metadata?.radiusMeters ?? HOTSPOT_DEFAULT_RADIUS_METERS,
      severity: metadata?.severity ?? riskScoreToSeverity(Number(hotspot.riskScore)),
      status: hotspot.isActive ? 'ACTIVE' : 'INACTIVE',
      incidentCount: hotspot.communityReports.length,
      assignedOfficer: hotspot.assignedPoliceman?.user
        ? {
            id: hotspot.assignedPoliceman.user.id,
            name: hotspot.assignedPoliceman.user.fullName,
          }
        : null,
    };
  });
}

export async function createHotspot(departmentUserId: string, input: { name: string; lat: number; lng: number; radius: number; severity: Severity }) {
  const hotspot = await prisma.safetyHotspot.create({
    data: {
      title: input.name.trim(),
      latitude: input.lat,
      longitude: input.lng,
      category: ReportCategory.unsafe_area,
      riskScore: severityToRiskScore(input.severity),
      reportCount: 0,
      verifiedCount: 0,
      peakDangerHours: [],
      isActive: true,
      isVerified: true,
    },
  });

  await createAuditLog(departmentUserId, 'DEPARTMENT_CREATED_HOTSPOT', hotspot.id, {
    departmentUserId,
    name: input.name.trim(),
    radiusMeters: input.radius,
    severity: input.severity,
    status: 'ACTIVE',
  }, 'SafetyHotspot');

  return {
    id: hotspot.id,
  };
}

export async function assignHotspot(departmentUserId: string, hotspotId: string, policemanId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const policeman = await ensureDepartmentPoliceman(departmentUserId, policemanId);
  const hotspot = await ensureDepartmentHotspotAccess(departmentUserId, organization.id, hotspotId);

  if (!policeman.workerProfile?.id) {
    throw new AppError('Officer worker profile not found', 404);
  }
  const workerProfileId = policeman.workerProfile.id;

  await prisma.$transaction(async (tx) => {
    await tx.safetyHotspot.updateMany({
      where: { assignedPolicemanId: workerProfileId },
      data: { assignedPolicemanId: null, assignedAt: null },
    });

    await tx.safetyHotspot.update({
      where: { id: hotspot.id },
      data: {
        assignedPolicemanId: workerProfileId,
        assignedAt: new Date(),
      },
    });

    await createAuditLog(departmentUserId, 'DEPARTMENT_ASSIGNED_HOTSPOT', hotspot.id, {
      officerId: policeman.id,
      officerName: policeman.fullName,
      hotspotName: hotspot.title ?? 'Department hotspot',
    }, 'SafetyHotspot', tx);
  });

  return { success: true };
}

export async function unassignHotspot(departmentUserId: string, hotspotId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const hotspot = await ensureDepartmentHotspotAccess(departmentUserId, organization.id, hotspotId);

  await prisma.$transaction(async (tx) => {
    await tx.safetyHotspot.update({
      where: { id: hotspot.id },
      data: { assignedPolicemanId: null, assignedAt: null },
    });

    await createAuditLog(departmentUserId, 'DEPARTMENT_UNASSIGNED_HOTSPOT', hotspot.id, {
      hotspotName: hotspot.title ?? 'Department hotspot',
    }, 'SafetyHotspot', tx);
  });

  return { success: true };
}

export async function updateHotspot(
  departmentUserId: string,
  hotspotId: string,
  input: { name?: string; lat?: number; lng?: number; radius?: number; severity?: Severity; status?: 'ACTIVE' | 'INACTIVE' }
) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const hotspot = await ensureDepartmentHotspotAccess(departmentUserId, organization.id, hotspotId);
  const existingMetadata = (await getHotspotMetadataMap([hotspotId])).get(hotspotId);

  const updated = await prisma.safetyHotspot.update({
    where: { id: hotspotId },
    data: {
      ...(input.name ? { title: input.name.trim() } : {}),
      ...(input.lat !== undefined ? { latitude: input.lat } : {}),
      ...(input.lng !== undefined ? { longitude: input.lng } : {}),
      ...(input.severity ? { riskScore: severityToRiskScore(input.severity) } : {}),
      ...(input.status ? { isActive: input.status === 'ACTIVE' } : {}),
    },
  });

  await createAuditLog(departmentUserId, 'DEPARTMENT_UPDATED_HOTSPOT', hotspotId, {
    name: input.name ?? hotspot.title ?? existingMetadata?.name ?? 'Department hotspot',
    radiusMeters: input.radius ?? existingMetadata?.radiusMeters ?? HOTSPOT_DEFAULT_RADIUS_METERS,
    severity: input.severity ?? existingMetadata?.severity ?? riskScoreToSeverity(Number(updated.riskScore)),
    status: input.status ?? (updated.isActive ? 'ACTIVE' : 'INACTIVE'),
  }, 'SafetyHotspot');

  return updated;
}

export async function deleteHotspot(departmentUserId: string, hotspotId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const hotspot = await ensureDepartmentHotspotAccess(departmentUserId, organization.id, hotspotId);
  const metadata = (await getHotspotMetadataMap([hotspotId])).get(hotspotId);
  const alerts = await getScopedAlerts([{
    id: hotspot.id,
    source: 'hotspot',
    name: hotspot.title ?? 'Department hotspot',
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    radiusMeters: metadata?.radiusMeters ?? HOTSPOT_DEFAULT_RADIUS_METERS,
  }]);

  if (alerts.some((alert) => alert.status !== 'RESOLVED')) {
    throw new AppError('Cannot delete hotspot with active SOS alerts linked to it', 400);
  }

  await prisma.safetyHotspot.delete({ where: { id: hotspotId } });
  await createAuditLog(departmentUserId, 'DEPARTMENT_DELETED_HOTSPOT', hotspotId, { hotspotName: hotspot.title ?? 'Department hotspot' }, 'SafetyHotspot');
}

export async function listIncidents(departmentUserId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const coverage = await getDepartmentCoverageAreas(departmentUserId, organization.id);

  const reports = await prisma.communityReport.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      title: true,
      description: true,
      latitude: true,
      longitude: true,
      score: true,
      createdAt: true,
      isAnonymous: true,
      isActive: true,
      reporter: { select: { fullName: true } },
      category: true,
      pinColor: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const noHotspotsConfigured = coverage.length === 0;
  const fallbackCenter = resolveFallbackIncidentCenter(reports);
  const items = reports
    .filter((report) => {
      if (!noHotspotsConfigured) {
        return isPointInsideCoverage(coverage, report.latitude, report.longitude);
      }

      return haversineDistance(fallbackCenter.latitude, fallbackCenter.longitude, report.latitude, report.longitude) <= FALLBACK_INCIDENT_RADIUS_KM;
    })
    .map((report) => serializeDepartmentIncident(report));

  return {
    items,
    noHotspotsConfigured,
    mapCenter: noHotspotsConfigured ? fallbackCenter : resolveMapCenter(coverage),
  };
}

export async function resolveIncident(departmentUserId: string, incidentId: string, notes?: string) {
  const incident = await prisma.communityReport.findUnique({
    where: { id: incidentId },
    select: { id: true, latitude: true, longitude: true, title: true },
  });

  if (!incident) {
    throw new AppError('Incident not found', 404);
  }

  const organization = await getDepartmentOrganization(departmentUserId);
  const coverage = await getDepartmentCoverageAreas(departmentUserId, organization.id);
  if (!isPointInsideCoverage(coverage, incident.latitude, incident.longitude)) {
    throw new AppError('Incident does not belong to this department scope', 403);
  }

  const updated = await prisma.communityReport.update({
    where: { id: incidentId },
    data: { isActive: false },
    select: { id: true, isActive: true },
  });

  await createAuditLog(departmentUserId, 'DEPARTMENT_RESOLVED_INCIDENT', incidentId, {
    title: incident.title ?? 'Incident report',
    notes: notes ?? null,
  }, 'CommunityReport');

  return updated;
}

export async function listSos(departmentUserId: string, query: { page?: number; pageSize?: number }) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const coverage = await getDepartmentCoverageAreas(departmentUserId, organization.id);
  const allAlerts = await getScopedAlerts(coverage);
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  const paged = allAlerts.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: paged,
    page,
    pageSize,
    total: allAlerts.length,
    totalPages: Math.max(1, Math.ceil(allAlerts.length / pageSize)),
  };
}

export async function acknowledgeSos(departmentUserId: string, alertId: string, officerId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const coverage = await getDepartmentCoverageAreas(departmentUserId, organization.id);
  const alert = await ensureDepartmentScopedAlert(alertId, coverage);
  const officer = await ensureDepartmentPoliceman(departmentUserId, officerId);

  const updated = await prisma.sosAlert.update({
    where: { id: alert.id },
    data: { status: AlertStatus.accepted },
    select: { id: true, status: true, updatedAt: true },
  });

  await prisma.alertStatusHistory.create({
    data: {
      alertId: alert.id,
      changedById: departmentUserId,
      changedByRole: UserRole.POLICE_DEPARTMENT,
      oldStatus: alert.status as AlertStatus,
      newStatus: AlertStatus.accepted,
      notes: `Assigned to ${officer.fullName}`,
    },
  });

  await createAuditLog(departmentUserId, 'DEPARTMENT_ACKNOWLEDGED_SOS', alert.id, {
    officerId: officer.id,
    officerName: officer.fullName,
    notes: `Assigned to ${officer.fullName}`,
  }, 'SosAlert');

  return updated;
}

export async function resolveSos(departmentUserId: string, alertId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const coverage = await getDepartmentCoverageAreas(departmentUserId, organization.id);
  const alert = await ensureDepartmentScopedAlert(alertId, coverage);

  const updated = await prisma.sosAlert.update({
    where: { id: alert.id },
    data: { status: AlertStatus.resolved, resolvedAt: new Date() },
    select: { id: true, status: true, resolvedAt: true },
  });

  await prisma.alertStatusHistory.create({
    data: {
      alertId: alert.id,
      changedById: departmentUserId,
      changedByRole: UserRole.POLICE_DEPARTMENT,
      oldStatus: alert.status as AlertStatus,
      newStatus: AlertStatus.resolved,
      notes: 'Resolved by department',
    },
  });

  await createAuditLog(departmentUserId, 'DEPARTMENT_RESOLVED_SOS', alert.id, {
    notes: 'Resolved by department',
  }, 'SosAlert');

  return updated;
}

export async function listZones(departmentUserId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const zones = await prisma.safeZone.findMany({
    where: { departmentId: organization.id },
    select: {
      id: true,
      name: true,
      type: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
      address: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const descriptions = await getZoneDescriptions(zones.map((zone) => zone.id));

  return zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    type: zone.type.toUpperCase() === 'RED' ? 'RED' : 'SAFE',
    latitude: zone.latitude,
    longitude: zone.longitude,
    radiusMeters: zone.radiusMeters ?? 1000,
    description: descriptions.get(zone.id) ?? zone.address ?? '',
  }));
}

export async function createZone(departmentUserId: string, input: { name: string; type: ZoneType; lat: number; lng: number; radius: number; description?: string }) {
  const organization = await getDepartmentOrganization(departmentUserId);

  const zone = await prisma.safeZone.create({
    data: {
      name: input.name.trim(),
      type: input.type,
      latitude: input.lat,
      longitude: input.lng,
      radiusMeters: input.radius,
      address: input.description?.trim() || null,
      departmentId: organization.id,
      departmentType: OrganizationType.police,
      addedBy: departmentUserId,
      isActive: true,
      isVerified: true,
    },
  });

  await createAuditLog(departmentUserId, 'DEPARTMENT_CREATED_ZONE', zone.id, {
    description: input.description ?? '',
    zoneType: input.type,
  }, 'SafeZone');

  return zone;
}

export async function updateZone(departmentUserId: string, zoneId: string, input: { name?: string; type?: ZoneType; lat?: number; lng?: number; radius?: number; description?: string }) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const zone = await prisma.safeZone.findFirst({
    where: { id: zoneId, departmentId: organization.id },
  });
  if (!zone) throw new AppError('Zone not found', 404);

  const updated = await prisma.safeZone.update({
    where: { id: zoneId },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.type ? { type: input.type } : {}),
      ...(input.lat !== undefined ? { latitude: input.lat } : {}),
      ...(input.lng !== undefined ? { longitude: input.lng } : {}),
      ...(input.radius !== undefined ? { radiusMeters: input.radius } : {}),
      ...(input.description !== undefined ? { address: input.description.trim() } : {}),
    },
  });

  await createAuditLog(departmentUserId, 'DEPARTMENT_UPDATED_ZONE', zoneId, {
    description: input.description ?? zone.address ?? '',
    zoneType: input.type ?? zone.type,
  }, 'SafeZone');

  return updated;
}

export async function deleteZone(departmentUserId: string, zoneId: string) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const zone = await prisma.safeZone.findFirst({
    where: { id: zoneId, departmentId: organization.id },
    select: { id: true, name: true },
  });
  if (!zone) throw new AppError('Zone not found', 404);

  await prisma.safeZone.delete({ where: { id: zoneId } });
  await createAuditLog(departmentUserId, 'DEPARTMENT_DELETED_ZONE', zoneId, { name: zone.name }, 'SafeZone');
}

export async function getActivity(departmentUserId: string) {
  const policemen = await prisma.user.findMany({
    where: { departmentId: departmentUserId, role: UserRole.POLICEMAN },
    select: { id: true, fullName: true, workerProfile: { select: { customRole: true } } },
  });

  const officerIds = policemen.map((item) => item.id);
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { actorId: departmentUserId },
        { actorId: { in: officerIds } },
        {
          action: { in: ['DEPARTMENT_ACKNOWLEDGED_SOS', 'DEPARTMENT_RESOLVED_SOS', 'DEPARTMENT_RESOLVED_INCIDENT'] },
          metadata: {
            path: ['officerId'],
            string_contains: '',
          },
        },
      ],
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      actorId: true,
      action: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const grouped = policemen.map((officer) => {
    const officerLogs = logs.filter((log) => readJsonString(log.metadata, 'officerId') === officer.id || log.actorId === officer.id);
    const sosResponses = officerLogs.filter((log) => log.action === 'DEPARTMENT_ACKNOWLEDGED_SOS' || log.action === 'DEPARTMENT_RESOLVED_SOS').length;
    const incidentsResolved = officerLogs.filter((log) => log.action === 'DEPARTMENT_RESOLVED_INCIDENT').length;
    return {
      officerId: officer.id,
      officerName: officer.fullName,
      badgeNumber: officer.workerProfile?.customRole ?? 'Badge',
      sosResponses,
      incidentsResolved,
      lastActiveAt: officerLogs[0]?.createdAt?.toISOString() ?? null,
    };
  });

  const totalResponses = grouped.reduce((sum, item) => sum + item.sosResponses + item.incidentsResolved, 0);
  const mostActiveOfficer = [...grouped].sort((a, b) => (b.sosResponses + b.incidentsResolved) - (a.sosResponses + a.incidentsResolved))[0] ?? null;

  return {
    summary: {
      mostActiveOfficer: mostActiveOfficer?.officerName ?? 'N/A',
      totalResponses,
      averageResponseTimeMinutes: 12,
    },
    officers: grouped,
    chart: grouped.map((item) => ({
      label: item.officerName,
      value: item.sosResponses + item.incidentsResolved,
    })),
  };
}

async function getRecentDepartmentActivity(departmentUserId: string, limit: number) {
  const organization = await getDepartmentOrganization(departmentUserId);
  const coverage = await getDepartmentCoverageAreas(departmentUserId, organization.id);
  const [alerts, incidentResult] = await Promise.all([
    getScopedAlerts(coverage),
    listIncidents(departmentUserId),
  ]);
  const incidents = incidentResult.items;

  return [
    ...alerts.slice(0, limit).map((alert) => ({
      id: `sos-${alert.id}`,
      type: 'SOS',
      title: `${alert.userName} SOS alert`,
      subtitle: `${alert.status} at ${formatCoordinates(alert.latitude, alert.longitude)}`,
      createdAt: alert.createdAt,
    })),
    ...incidents.slice(0, limit).map((incident) => ({
      id: `incident-${incident.id}`,
      type: 'INCIDENT',
      title: incident.type,
      subtitle: `${incident.status} at ${formatCoordinates(incident.latitude, incident.longitude)}`,
      createdAt: incident.timestamp,
    })),
  ]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit);
}

async function getDepartmentOrganization(departmentUserId: string) {
  let organization = await prisma.organization.findFirst({
    where: {
      createdById: departmentUserId,
      organizationType: OrganizationType.police,
    },
    select: { id: true, organizationName: true },
  });

  if (!organization) {
    const owner = await prisma.user.findFirst({
      where: { id: departmentUserId, role: UserRole.POLICE_DEPARTMENT },
      select: { fullName: true, email: true },
    });

    if (!owner) throw new AppError('Police department organization not found', 404);

    organization = await prisma.organization.create({
      data: {
        organizationName: owner.fullName,
        organizationType: OrganizationType.police,
        email: owner.email,
        status: OrganizationStatus.approved,
        createdById: departmentUserId,
        approvedAt: new Date(),
      },
      select: { id: true, organizationName: true },
    });
  }

  return organization;
}

async function ensureDepartmentPoliceman(departmentUserId: string, policemanId: string) {
  const policeman = await prisma.user.findFirst({
    where: {
      id: policemanId,
      role: UserRole.POLICEMAN,
      departmentId: departmentUserId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      workerProfile: {
        select: {
          id: true,
          customRole: true,
          assignedHotspots: {
            where: { isActive: true },
            select: { id: true, title: true, assignedAt: true },
            take: 1,
            orderBy: { assignedAt: 'desc' },
          },
        },
      },
    },
  });

  if (!policeman) throw new AppError('Policeman not found', 404);
  return policeman;
}

async function getDepartmentCreatedHotspotIds(departmentUserId: string) {
  const createdLogs = await prisma.auditLog.findMany({
    where: {
      actorId: departmentUserId,
      action: 'DEPARTMENT_CREATED_HOTSPOT',
      entityType: 'SafetyHotspot',
    },
    select: { entityId: true },
  });

  return createdLogs.map((item) => item.entityId).filter((value): value is string => Boolean(value));
}

async function getHotspotMetadataMap(hotspotIds: string[]) {
  if (!hotspotIds.length) return new Map<string, { name?: string; radiusMeters?: number; severity?: Severity }>();

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'SafetyHotspot',
      entityId: { in: hotspotIds },
      action: { in: HOTSPOT_METADATA_ACTIONS },
    },
    select: {
      entityId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const map = new Map<string, { name?: string; radiusMeters?: number; severity?: Severity }>();
  logs.forEach((log) => {
    if (!log.entityId || map.has(log.entityId)) return;
    map.set(log.entityId, {
      name: readJsonString(log.metadata, 'name') ?? undefined,
      radiusMeters: readJsonNumber(log.metadata, 'radiusMeters') ?? undefined,
      severity: readJsonString(log.metadata, 'severity') as Severity | undefined,
    });
  });

  return map;
}

async function ensureDepartmentHotspotAccess(departmentUserId: string, organizationId: string, hotspotId: string) {
  const createdHotspotIds = await getDepartmentCreatedHotspotIds(departmentUserId);
  const hotspot = await prisma.safetyHotspot.findFirst({
    where: {
      id: hotspotId,
      OR: [
        { id: { in: createdHotspotIds } },
        { assignedPoliceman: { organizationId } },
      ],
    },
    select: { id: true, title: true, latitude: true, longitude: true },
  });

  if (!hotspot) throw new AppError('Hotspot not found in this department scope', 404);
  return hotspot;
}

async function getDepartmentZones(organizationId: string) {
  return prisma.safeZone.findMany({
    where: { departmentId: organizationId, isActive: true },
    select: {
      id: true,
      name: true,
      type: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
      addedBy: true,
    },
  });
}

async function getZoneDescriptions(zoneIds: string[]) {
  if (!zoneIds.length) return new Map<string, string>();
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'SafeZone',
      entityId: { in: zoneIds },
      action: { in: ['DEPARTMENT_CREATED_ZONE', 'DEPARTMENT_UPDATED_ZONE'] },
    },
    select: {
      entityId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const descriptions = new Map<string, string>();
  logs.forEach((log) => {
    if (!log.entityId || descriptions.has(log.entityId)) return;
    descriptions.set(log.entityId, readJsonString(log.metadata, 'description') ?? '');
  });
  return descriptions;
}

async function getDepartmentCoverageAreas(departmentUserId: string, organizationId: string): Promise<CoverageArea[]> {
  const [zones, hotspots] = await Promise.all([
    getDepartmentZones(organizationId),
    listHotspots(departmentUserId),
  ]);

  return [
    ...zones.map((zone) => ({
      id: zone.id,
      source: 'zone' as const,
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusMeters: zone.radiusMeters ?? 1000,
      type: (zone.type.toUpperCase() === 'RED' ? 'RED' : 'SAFE') as ZoneType,
    })),
    ...hotspots.map((hotspot) => ({
      id: hotspot.id,
      source: 'hotspot' as const,
      name: hotspot.name,
      latitude: hotspot.latitude,
      longitude: hotspot.longitude,
      radiusMeters: hotspot.radiusMeters,
      severity: hotspot.severity,
      assignedOfficer: hotspot.assignedOfficer?.name ?? null,
    })),
  ];
}

async function getScopedAlerts(coverage: CoverageArea[]) {
  if (!coverage.length) return [];

  const alerts = await prisma.sosAlert.findMany({
    where: {
      triggerLatitude: { not: null },
      triggerLongitude: { not: null },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      alertCode: true,
      status: true,
      triggerLatitude: true,
      triggerLongitude: true,
      createdAt: true,
      user: {
        select: {
          fullName: true,
        },
      },
      triggerAddress: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const acknowledgements = await prisma.auditLog.findMany({
    where: {
      entityType: 'SosAlert',
      entityId: { in: alerts.map((alert) => alert.id) },
      action: 'DEPARTMENT_ACKNOWLEDGED_SOS',
    },
    select: {
      entityId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const officerMap = new Map<string, { id: string; name: string }>();
  acknowledgements.forEach((log) => {
    if (!log.entityId || officerMap.has(log.entityId)) return;
    const officerId = readJsonString(log.metadata, 'officerId');
    const officerName = readJsonString(log.metadata, 'officerName');
    if (officerId && officerName) {
      officerMap.set(log.entityId, { id: officerId, name: officerName });
    }
  });

  return alerts
    .filter((alert) => isPointInsideCoverage(coverage, alert.triggerLatitude ?? 0, alert.triggerLongitude ?? 0))
    .map((alert) => ({
      id: alert.id,
      alertCode: alert.alertCode,
      userName: alert.user.fullName || 'Anonymous',
      latitude: alert.triggerLatitude ?? 0,
      longitude: alert.triggerLongitude ?? 0,
      createdAt: alert.createdAt.toISOString(),
      status: mapAlertStatus(alert.status),
      triggerAddress: alert.triggerAddress ?? null,
      assignedOfficer: officerMap.get(alert.id) ?? null,
    }));
}

async function ensureDepartmentScopedAlert(alertId: string, coverage: CoverageArea[]) {
  const alert = await prisma.sosAlert.findUnique({
    where: { id: alertId },
    select: {
      id: true,
      status: true,
      triggerLatitude: true,
      triggerLongitude: true,
    },
  });

  if (!alert) throw new AppError('SOS alert not found', 404);
  if (!isPointInsideCoverage(coverage, alert.triggerLatitude ?? 0, alert.triggerLongitude ?? 0)) {
    throw new AppError('SOS alert does not belong to this department scope', 403);
  }

  return alert;
}

function isPointInsideCoverage(coverage: CoverageArea[], latitude: number, longitude: number) {
  return coverage.some((item) => haversineDistance(item.latitude, item.longitude, latitude, longitude) * 1000 <= item.radiusMeters);
}

function resolveMapCenter(coverage: CoverageArea[]) {
  if (!coverage.length) {
    return INDIA_CENTER;
  }

  const latitude = coverage.reduce((sum, item) => sum + item.latitude, 0) / coverage.length;
  const longitude = coverage.reduce((sum, item) => sum + item.longitude, 0) / coverage.length;
  return { latitude, longitude };
}

function mapAlertStatus(status: AlertStatus) {
  if (status === AlertStatus.accepted) return 'ACKNOWLEDGED';
  if (status === AlertStatus.resolved) return 'RESOLVED';
  return 'PENDING';
}

function riskScoreToSeverity(score: number): Severity {
  if (score >= 0.75) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

function severityToRiskScore(severity: Severity) {
  if (severity === 'HIGH') return new Prisma.Decimal(0.9);
  if (severity === 'MEDIUM') return new Prisma.Decimal(0.55);
  return new Prisma.Decimal(0.25);
}

function pinColorToSeverity(color: string): Severity {
  if (color === 'red') return 'HIGH';
  if (color === 'yellow') return 'MEDIUM';
  return 'LOW';
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function resolveFallbackIncidentCenter(reports: Array<{ latitude: number; longitude: number }>) {
  if (!reports.length) return INDIA_CENTER;

  return {
    latitude: reports.reduce((sum, report) => sum + Number(report.latitude), 0) / reports.length,
    longitude: reports.reduce((sum, report) => sum + Number(report.longitude), 0) / reports.length,
  };
}

function serializeDepartmentIncident(report: {
  id: string;
  latitude: number;
  longitude: number;
  title: string | null;
  category: string;
  pinColor: string;
  isAnonymous: boolean;
  reporter: { fullName: string } | null;
  createdAt: Date;
  score: number;
  isActive: boolean;
  description: string | null;
}) {
  return {
    id: report.id,
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    type: report.title ?? String(report.category).replace(/_/g, ' '),
    severity: pinColorToSeverity(report.pinColor),
    reporterName: report.isAnonymous ? 'Anonymous' : report.reporter?.fullName ?? 'Anonymous',
    timestamp: report.createdAt.toISOString(),
    pinScore: Number(report.score),
    status: report.isActive ? 'OPEN' : 'RESOLVED',
    description: report.description ?? '',
  };
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

function buildDepartmentZoneRoom(zoneId: string) {
  return `department-zone:${zoneId}`;
}

export async function emitDepartmentScopedSosNotification(alertId: string, latitude: number, longitude: number) {
  const zones = await prisma.safeZone.findMany({
    where: {
      isActive: true,
      department: {
        organizationType: OrganizationType.police,
      },
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      radiusMeters: true,
    },
  });

  const roomIds = zones
    .filter((zone) => haversineDistance(zone.latitude, zone.longitude, latitude, longitude) * 1000 <= (zone.radiusMeters ?? 1000))
    .map((zone) => buildDepartmentZoneRoom(zone.id));

  if (roomIds.length) {
    emitDepartmentScopedSOSCreated(roomIds, { alertId, latitude, longitude });
  }
}
