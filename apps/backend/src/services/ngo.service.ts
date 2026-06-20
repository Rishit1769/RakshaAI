import { OrganizationType, Prisma, UserRole, VolunteerStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import * as HierarchyService from './hierarchy.service';
import { createAuditLog } from '../utils/createAuditLog';
import { haversineDistance } from '../utils/haversine';
import { emitNgoScopedSOSCreated } from '../sockets';

type CoverageArea = {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  name: string;
};

const INCIDENT_ASSIGN_ACTION = 'NGO_ASSIGNED_INCIDENT';
const INCIDENT_UNASSIGN_ACTION = 'NGO_UNASSIGNED_INCIDENT';
const INCIDENT_CLOSE_ACTION = 'NGO_CLOSED_INCIDENT';
const SOS_RESPOND_ACTION = 'NGO_RESPONDING_SOS';
const SOS_CLOSE_ACTION = 'NGO_CLOSED_SOS';

export async function getNavigationMeta(ngoUserId: string) {
  const organization = await getNgoOrganization(ngoUserId);
  const coverage = await getNgoCoverageAreas(ngoUserId, organization.id);
  const alerts = await getScopedAlerts(coverage);
  return {
    ngoName: organization.organizationName,
    liveSosCount: alerts.filter((alert) => alert.status !== 'RESOLVED').length,
    roomIds: coverage.map((area) => buildNgoCoverageRoom(area.id)),
  };
}

export async function getOverview(ngoUserId: string) {
  const organization = await getNgoOrganization(ngoUserId);
  const [volunteers, coverage, incidents, alerts, recentActivity] = await Promise.all([
    listVolunteers(ngoUserId),
    getNgoCoverageAreas(ngoUserId, organization.id),
    listAllNearbyIncidents(ngoUserId),
    getScopedAlerts(await getNgoCoverageAreas(ngoUserId, organization.id)),
    getRecentNgoActivity(ngoUserId, 10),
  ]);

  const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
  const last7Days = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return {
    metrics: [
      { label: 'Volunteers', value: volunteers.length },
      { label: 'Active case assignments', value: volunteers.filter((volunteer) => volunteer.currentAssignment).length },
      { label: 'SOS in 24h', value: alerts.filter((alert) => new Date(alert.createdAt).getTime() >= last24Hours).length },
      { label: 'SOS in 7d', value: alerts.filter((alert) => new Date(alert.createdAt).getTime() >= last7Days).length },
      { label: 'Incidents responded in 7d', value: incidents.filter((incident) => incident.status !== 'OPEN' && new Date(incident.timeReported).getTime() >= last7Days).length },
      { label: 'Unacknowledged SOS', value: alerts.filter((alert) => alert.status === 'PENDING').length },
    ],
    map: {
      center: resolveMapCenter(coverage),
      coverage: coverage.map((area) => ({
        id: area.id,
        name: area.name,
        latitude: area.latitude,
        longitude: area.longitude,
        radiusMeters: area.radiusMeters,
      })),
      volunteers: volunteers.filter((volunteer) => volunteer.lastLocation).map((volunteer) => ({
        id: volunteer.id,
        name: volunteer.fullName,
        latitude: volunteer.lastLocation!.latitude,
        longitude: volunteer.lastLocation!.longitude,
      })),
    },
    recentActivity,
  };
}

export async function createVolunteer(ngoUserId: string, input: Parameters<typeof HierarchyService.createVolunteer>[1]) {
  return HierarchyService.createVolunteer(ngoUserId, input);
}

export async function listVolunteers(ngoUserId: string) {
  const volunteers = await prisma.user.findMany({
    where: { role: UserRole.VOLUNTEER, ngoId: ngoUserId },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      lastLoginAt: true,
      volunteerProfile: {
        select: {
          id: true,
          lastActiveAt: true,
        },
      },
      userLocations: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
        select: { latitude: true, longitude: true, recordedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const assignments = await getVolunteerCurrentAssignments(volunteers.map((volunteer) => volunteer.id));

  return volunteers.map((volunteer) => ({
    id: volunteer.id,
    fullName: volunteer.fullName,
    email: volunteer.email,
    isActive: volunteer.isActive,
    mustChangePassword: volunteer.mustChangePassword,
    currentAssignment: assignments.get(volunteer.id) ?? null,
    lastActive: volunteer.volunteerProfile?.lastActiveAt?.toISOString() ?? volunteer.lastLoginAt?.toISOString() ?? null,
    lastLocation: volunteer.userLocations[0]
      ? {
          latitude: volunteer.userLocations[0].latitude,
          longitude: volunteer.userLocations[0].longitude,
          recordedAt: volunteer.userLocations[0].recordedAt.toISOString(),
        }
      : null,
  }));
}

export async function setVolunteerActiveState(ngoUserId: string, volunteerId: string, isActive: boolean) {
  const volunteer = await ensureNgoVolunteer(ngoUserId, volunteerId);
  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: volunteerId },
      data: { isActive },
      select: { id: true, fullName: true, email: true, isActive: true },
    });

    if (volunteer.volunteerProfileId) {
      await tx.volunteer.update({
        where: { id: volunteer.volunteerProfileId },
        data: { status: isActive ? VolunteerStatus.offline : VolunteerStatus.suspended },
      });
    }

    await createAuditLog(
      ngoUserId,
      isActive ? 'NGO_REACTIVATED_VOLUNTEER' : 'NGO_DEACTIVATED_VOLUNTEER',
      volunteerId,
      { volunteerName: volunteer.fullName, email: volunteer.email },
      'User',
      tx
    );

    return user;
  });

  return updated;
}

export async function getVolunteerDetail(ngoUserId: string, volunteerId: string) {
  const volunteer = await ensureNgoVolunteer(ngoUserId, volunteerId);
  const [assignmentHistory, checkIns] = await Promise.all([
    getVolunteerAssignmentHistory(volunteerId),
    prisma.auditLog.findMany({
      where: { actorId: volunteerId, action: 'VOLUNTEER_CHECK_IN' },
      select: { id: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    id: volunteer.id,
    fullName: volunteer.fullName,
    email: volunteer.email,
    isActive: volunteer.isActive,
    currentAssignment: (await getVolunteerCurrentAssignments([volunteerId])).get(volunteerId) ?? null,
    totalCasesHandled: assignmentHistory.filter((item) => item.status === 'CLOSED').length,
    lastCheckIn: checkIns[0]
      ? {
          createdAt: checkIns[0].createdAt.toISOString(),
          latitude: readJsonNumber(checkIns[0].metadata, 'latitude'),
          longitude: readJsonNumber(checkIns[0].metadata, 'longitude'),
        }
      : null,
    assignmentHistory,
    checkIns: checkIns.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      latitude: readJsonNumber(item.metadata, 'latitude'),
      longitude: readJsonNumber(item.metadata, 'longitude'),
      notes: readJsonString(item.metadata, 'notes'),
    })),
  };
}

export async function listOpenIncidents(ngoUserId: string) {
  const incidents = await listAllNearbyIncidents(ngoUserId);
  return incidents.filter((incident) => incident.status === 'OPEN');
}

export async function listAssignedIncidents(ngoUserId: string) {
  const incidents = await listAllNearbyIncidents(ngoUserId);
  return incidents.filter((incident) => incident.status !== 'OPEN');
}

export async function assignIncident(ngoUserId: string, incidentId: string, volunteerId: string) {
  const incident = await ensureNgoScopedIncident(ngoUserId, incidentId);
  const volunteer = await ensureNgoVolunteer(ngoUserId, volunteerId);
  if (!volunteer.isActive) throw new AppError('Volunteer must be active to accept incidents', 400);

  await createAuditLog(ngoUserId, INCIDENT_ASSIGN_ACTION, incidentId, {
    volunteerId,
    volunteerName: volunteer.fullName,
    incidentType: incident.type,
  }, 'CommunityReport');

  return { success: true };
}

export async function unassignIncident(ngoUserId: string, incidentId: string) {
  await ensureNgoScopedIncident(ngoUserId, incidentId);
  await createAuditLog(ngoUserId, INCIDENT_UNASSIGN_ACTION, incidentId, {}, 'CommunityReport');
  return { success: true };
}

export async function closeIncident(ngoUserId: string, incidentId: string) {
  const incident = await ensureNgoScopedIncident(ngoUserId, incidentId);
  await createAuditLog(ngoUserId, INCIDENT_CLOSE_ACTION, incidentId, {
    incidentType: incident.type,
  }, 'CommunityReport');
  return { success: true };
}

export async function listSos(ngoUserId: string, query: { page?: number; pageSize?: number }) {
  const organization = await getNgoOrganization(ngoUserId);
  const coverage = await getNgoCoverageAreas(ngoUserId, organization.id);
  const alerts = await getScopedAlerts(coverage);
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);
  return {
    items: alerts.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: alerts.length,
    totalPages: Math.max(1, Math.ceil(alerts.length / pageSize)),
  };
}

export async function respondSos(ngoUserId: string, alertId: string, volunteerId: string) {
  const organization = await getNgoOrganization(ngoUserId);
  const coverage = await getNgoCoverageAreas(ngoUserId, organization.id);
  await ensureNgoScopedAlert(alertId, coverage);
  const volunteer = await ensureNgoVolunteer(ngoUserId, volunteerId);
  if (!volunteer.isActive) throw new AppError('Volunteer must be active to respond to SOS', 400);

  await createAuditLog(ngoUserId, SOS_RESPOND_ACTION, alertId, {
    volunteerId,
    volunteerName: volunteer.fullName,
  }, 'SosAlert');

  return { success: true };
}

export async function closeSos(ngoUserId: string, alertId: string) {
  const organization = await getNgoOrganization(ngoUserId);
  const coverage = await getNgoCoverageAreas(ngoUserId, organization.id);
  await ensureNgoScopedAlert(alertId, coverage);
  await createAuditLog(ngoUserId, SOS_CLOSE_ACTION, alertId, {}, 'SosAlert');
  return { success: true };
}

export async function listVisibleZones(ngoUserId: string) {
  await getNgoOrganization(ngoUserId);
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
        department: { select: { organizationName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.redZone.findMany({
      select: { id: true, description: true, latitude: true, longitude: true },
      orderBy: { triggeredAt: 'desc' },
      take: 100,
    }),
  ]);

  return [
    ...safeZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      type: zone.type.toUpperCase() === 'RED' ? 'RED' : 'SAFE',
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusMeters: zone.radiusMeters ?? 1000,
      createdBy: zone.department?.organizationName ?? 'Police department',
    })),
    ...redZones.map((zone) => ({
      id: zone.id,
      name: zone.description.slice(0, 48) || 'RedZone',
      type: 'RED',
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusMeters: 1000,
      createdBy: 'Police department',
    })),
  ];
}

export async function getActivity(ngoUserId: string) {
  const volunteers = await prisma.user.findMany({
    where: { role: UserRole.VOLUNTEER, ngoId: ngoUserId },
    select: { id: true, fullName: true },
  });
  const volunteerIds = volunteers.map((item) => item.id);

  const checkIns = await prisma.auditLog.findMany({
    where: { actorId: { in: volunteerIds }, action: 'VOLUNTEER_CHECK_IN', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    select: { actorId: true, createdAt: true },
  });
  const actions = await prisma.auditLog.findMany({
    where: {
      action: { in: [INCIDENT_ASSIGN_ACTION, INCIDENT_CLOSE_ACTION, SOS_RESPOND_ACTION, SOS_CLOSE_ACTION] },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { action: true, metadata: true, createdAt: true },
  });

  const grouped = volunteers.map((volunteer) => {
    const volunteerActions = actions.filter((item) => readJsonString(item.metadata, 'volunteerId') === volunteer.id);
    const sosResponses = volunteerActions.filter((item) => item.action === SOS_RESPOND_ACTION || item.action === SOS_CLOSE_ACTION).length;
    const incidentsHandled = volunteerActions.filter((item) => item.action === INCIDENT_ASSIGN_ACTION || item.action === INCIDENT_CLOSE_ACTION).length;
    const lastActive = [
      ...volunteerActions.map((item) => item.createdAt),
      ...checkIns.filter((item) => item.actorId === volunteer.id).map((item) => item.createdAt),
    ].sort((a, b) => +b - +a)[0];
    return {
      volunteerId: volunteer.id,
      volunteerName: volunteer.fullName,
      sosResponses,
      incidentsHandled,
      lastActiveAt: lastActive?.toISOString() ?? null,
    };
  });

  const mostActive = [...grouped].sort((a, b) => (b.sosResponses + b.incidentsHandled) - (a.sosResponses + a.incidentsHandled))[0];

  return {
    summary: {
      mostActiveVolunteer: mostActive?.volunteerName ?? 'N/A',
      totalResponses: grouped.reduce((sum, item) => sum + item.sosResponses, 0),
      totalCases: grouped.reduce((sum, item) => sum + item.incidentsHandled, 0),
    },
    volunteers: grouped,
    chart: grouped.map((item) => ({ label: item.volunteerName, value: item.sosResponses + item.incidentsHandled })),
  };
}

async function getNgoOrganization(ngoUserId: string) {
  const organization = await prisma.organization.findFirst({
    where: { createdById: ngoUserId, organizationType: OrganizationType.ngo },
    select: { id: true, organizationName: true },
  });
  if (!organization) throw new AppError('NGO organization not found', 404);
  return organization;
}

async function ensureNgoVolunteer(ngoUserId: string, volunteerId: string) {
  const volunteer = await prisma.user.findFirst({
    where: { id: volunteerId, role: UserRole.VOLUNTEER, ngoId: ngoUserId },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      volunteerProfile: { select: { id: true } },
    },
  });
  if (!volunteer) throw new AppError('Volunteer not found', 404);
  return {
    ...volunteer,
    volunteerProfileId: volunteer.volunteerProfile?.id ?? null,
  };
}

async function getNgoCoverageAreas(ngoUserId: string, organizationId: string): Promise<CoverageArea[]> {
  const [zones, locations] = await Promise.all([
    prisma.safeZone.findMany({
      where: { departmentId: organizationId, isActive: true },
      select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
    }),
    prisma.userLocation.findMany({
      where: { user: { ngoId: ngoUserId, role: UserRole.VOLUNTEER } },
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
      id: `volunteer-location-${index}`,
      name: 'Volunteer coverage',
      latitude: location.latitude,
      longitude: location.longitude,
      radiusMeters: 5000,
    }));
  }

  return [{
    id: `ngo-${organizationId}`,
    name: 'NGO coverage',
    latitude: 20.5937,
    longitude: 78.9629,
    radiusMeters: 5000,
  }];
}

async function listAllNearbyIncidents(ngoUserId: string) {
  const organization = await getNgoOrganization(ngoUserId);
  const coverage = await getNgoCoverageAreas(ngoUserId, organization.id);
  const reports = await prisma.communityReport.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      category: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      city: true,
      pinColor: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  const assignments = await getIncidentAssignmentState(reports.map((report) => report.id));
  const center = resolveMapCenter(coverage);

  return reports
    .filter((report) => isWithinCoverage(coverage, report.latitude, report.longitude))
    .map((report) => {
      const assignment = assignments.get(report.id);
      return {
        id: report.id,
        type: report.title ?? String(report.category).replace(/_/g, ' '),
        severity: pinColorToSeverity(report.pinColor),
        location: report.city ?? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`,
        latitude: report.latitude,
        longitude: report.longitude,
        timeReported: report.createdAt.toISOString(),
        distanceKm: haversineDistance(center.latitude, center.longitude, report.latitude, report.longitude),
        volunteer: assignment?.volunteer ?? null,
        assignedAt: assignment?.assignedAt ?? null,
        status: assignment?.status ?? 'OPEN',
      };
    });
}

async function getIncidentAssignmentState(reportIds: string[]) {
  if (!reportIds.length) return new Map<string, { volunteer?: { id: string; name: string } | null; assignedAt?: string | null; status: 'OPEN' | 'ASSIGNED' | 'CLOSED' }>();
  const logs = await prisma.auditLog.findMany({
    where: {
      entityType: 'CommunityReport',
      entityId: { in: reportIds },
      action: { in: [INCIDENT_ASSIGN_ACTION, INCIDENT_UNASSIGN_ACTION, INCIDENT_CLOSE_ACTION] },
    },
    select: { entityId: true, action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  const state = new Map<string, { volunteer?: { id: string; name: string } | null; assignedAt?: string | null; status: 'OPEN' | 'ASSIGNED' | 'CLOSED' }>();
  logs.forEach((log) => {
    if (!log.entityId || state.has(log.entityId)) return;
    if (log.action === INCIDENT_CLOSE_ACTION) {
      state.set(log.entityId, { status: 'CLOSED', volunteer: null, assignedAt: log.createdAt.toISOString() });
      return;
    }
    if (log.action === INCIDENT_UNASSIGN_ACTION) {
      state.set(log.entityId, { status: 'OPEN', volunteer: null, assignedAt: null });
      return;
    }
    state.set(log.entityId, {
      status: 'ASSIGNED',
      volunteer: {
        id: readJsonString(log.metadata, 'volunteerId') ?? '',
        name: readJsonString(log.metadata, 'volunteerName') ?? 'Volunteer',
      },
      assignedAt: log.createdAt.toISOString(),
    });
  });
  return state;
}

async function getVolunteerCurrentAssignments(volunteerIds: string[]) {
  const result = new Map<string, { type: 'INCIDENT' | 'SOS'; label: string }>();
  if (!volunteerIds.length) return result;

  const incidentLogs = await prisma.auditLog.findMany({
    where: { action: { in: [INCIDENT_ASSIGN_ACTION, INCIDENT_CLOSE_ACTION, INCIDENT_UNASSIGN_ACTION] } },
    select: { action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  incidentLogs.forEach((log) => {
    const volunteerId = readJsonString(log.metadata, 'volunteerId');
    if (!volunteerId || result.has(volunteerId) || !volunteerIds.includes(volunteerId)) return;
    if (log.action === INCIDENT_ASSIGN_ACTION) {
      result.set(volunteerId, { type: 'INCIDENT', label: readJsonString(log.metadata, 'incidentType') ?? 'Assigned incident' });
    }
  });

  const sosLogs = await prisma.auditLog.findMany({
    where: { action: { in: [SOS_RESPOND_ACTION, SOS_CLOSE_ACTION] } },
    select: { action: true, metadata: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  sosLogs.forEach((log) => {
    const volunteerId = readJsonString(log.metadata, 'volunteerId');
    if (!volunteerId || result.has(volunteerId) || !volunteerIds.includes(volunteerId)) return;
    if (log.action === SOS_RESPOND_ACTION) {
      result.set(volunteerId, { type: 'SOS', label: 'Active SOS response' });
    }
  });

  return result;
}

async function getVolunteerAssignmentHistory(volunteerId: string) {
  const [incidentLogs, sosLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: { action: { in: [INCIDENT_ASSIGN_ACTION, INCIDENT_UNASSIGN_ACTION, INCIDENT_CLOSE_ACTION] } },
      select: { id: true, action: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: [SOS_RESPOND_ACTION, SOS_CLOSE_ACTION] } },
      select: { id: true, action: true, metadata: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return [
    ...incidentLogs.filter((log) => readJsonString(log.metadata, 'volunteerId') === volunteerId).map((log) => ({
      id: log.id,
      type: 'INCIDENT',
      label: readJsonString(log.metadata, 'incidentType') ?? 'Incident',
      createdAt: log.createdAt.toISOString(),
      status: log.action === INCIDENT_CLOSE_ACTION ? 'CLOSED' : log.action === INCIDENT_ASSIGN_ACTION ? 'ASSIGNED' : 'OPEN',
    })),
    ...sosLogs.filter((log) => readJsonString(log.metadata, 'volunteerId') === volunteerId).map((log) => ({
      id: log.id,
      type: 'SOS',
      label: 'SOS response',
      createdAt: log.createdAt.toISOString(),
      status: log.action === SOS_CLOSE_ACTION ? 'CLOSED' : 'ASSIGNED',
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

async function getScopedAlerts(coverage: CoverageArea[]) {
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
  const responseMap = new Map<string, { id: string; name: string; closed: boolean }>();
  logs.forEach((log) => {
    if (!log.entityId || responseMap.has(log.entityId)) return;
    responseMap.set(log.entityId, {
      id: readJsonString(log.metadata, 'volunteerId') ?? '',
      name: readJsonString(log.metadata, 'volunteerName') ?? 'Volunteer',
      closed: log.action === SOS_CLOSE_ACTION,
    });
  });

  return alerts
    .filter((alert) => isWithinCoverage(coverage, alert.triggerLatitude ?? 0, alert.triggerLongitude ?? 0))
    .map((alert) => {
      const response = responseMap.get(alert.id);
      return {
        id: alert.id,
        alertCode: alert.alertCode,
        userName: alert.user.fullName || 'Anonymous',
        latitude: alert.triggerLatitude ?? 0,
        longitude: alert.triggerLongitude ?? 0,
        createdAt: alert.createdAt.toISOString(),
        status: response?.closed ? 'RESOLVED' : response ? 'RESPONDING' : 'PENDING',
        assignedVolunteer: response?.id ? { id: response.id, name: response.name } : null,
      };
    });
}

async function ensureNgoScopedAlert(alertId: string, coverage: CoverageArea[]) {
  const alert = await prisma.sosAlert.findUnique({
    where: { id: alertId },
    select: { id: true, triggerLatitude: true, triggerLongitude: true },
  });
  if (!alert) throw new AppError('SOS alert not found', 404);
  if (!isWithinCoverage(coverage, alert.triggerLatitude ?? 0, alert.triggerLongitude ?? 0)) {
    throw new AppError('SOS alert does not belong to this NGO scope', 403);
  }
  return alert;
}

async function ensureNgoScopedIncident(ngoUserId: string, incidentId: string) {
  const incidents = await listAllNearbyIncidents(ngoUserId);
  const incident = incidents.find((item) => item.id === incidentId);
  if (!incident) throw new AppError('Incident not found in this NGO scope', 404);
  return incident;
}

async function getRecentNgoActivity(ngoUserId: string, limit: number) {
  const [sos, incidents] = await Promise.all([
    listSos(ngoUserId, { page: 1, pageSize: limit }),
    listAssignedIncidents(ngoUserId),
  ]);
  return [
    ...sos.items.map((alert) => ({
      id: `sos-${alert.id}`,
      type: 'SOS',
      title: `${alert.userName} SOS alert`,
      subtitle: `${alert.status} near ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`,
      createdAt: alert.createdAt,
    })),
    ...incidents.slice(0, limit).map((incident) => ({
      id: `incident-${incident.id}`,
      type: 'INCIDENT',
      title: incident.type,
      subtitle: `${incident.status} • ${incident.location}`,
      createdAt: incident.timeReported,
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
}

function isWithinCoverage(coverage: CoverageArea[], latitude: number, longitude: number) {
  return coverage.some((area) => haversineDistance(area.latitude, area.longitude, latitude, longitude) * 1000 <= area.radiusMeters);
}

function resolveMapCenter(coverage: CoverageArea[]) {
  const latitude = coverage.reduce((sum, area) => sum + area.latitude, 0) / coverage.length;
  const longitude = coverage.reduce((sum, area) => sum + area.longitude, 0) / coverage.length;
  return { latitude, longitude };
}

function pinColorToSeverity(color: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (color === 'red') return 'HIGH';
  if (color === 'yellow') return 'MEDIUM';
  return 'LOW';
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

function buildNgoCoverageRoom(id: string) {
  return `ngo-zone:${id}`;
}

export async function emitNgoScopedSosNotification(alertId: string, latitude: number, longitude: number) {
  const organizations = await prisma.organization.findMany({
    where: { organizationType: OrganizationType.ngo },
    select: { id: true, createdById: true },
  });
  const roomIds = new Set<string>();

  for (const organization of organizations) {
    const coverage = await getNgoCoverageAreas(organization.createdById, organization.id);
    coverage.forEach((area) => {
      if (haversineDistance(area.latitude, area.longitude, latitude, longitude) * 1000 <= area.radiusMeters) {
        roomIds.add(buildNgoCoverageRoom(area.id));
      }
    });
  }

  if (roomIds.size) {
    emitNgoScopedSOSCreated([...roomIds], { alertId, latitude, longitude });
  }
}
