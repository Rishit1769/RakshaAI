import { OrganizationStatus, OrganizationType, Prisma, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { haversineDistance } from '../utils/haversine';
import { createAuditLog } from '../utils/createAuditLog';

type UserListQuery = {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  status?: 'active' | 'suspended';
  search?: string;
};

type AuditLogQuery = {
  page?: number;
  pageSize?: number;
  action?: string;
};

type ModerationItemType = 'incident' | 'comment';

const INDIA_CENTER = { latitude: 20.5937, longitude: 78.9629 };
const MODERATION_REPORT_THRESHOLD = 5;
const HOTSPOT_MATCH_RADIUS_KM = 2;

export async function getNavigationMeta(actorId: string) {
  const [user, pendingModerationCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actorId },
      select: { fullName: true, email: true },
    }),
    getPendingModerationCount(),
  ]);

  return {
    adminName: user?.fullName ?? 'Superadmin',
    adminEmail: user?.email ?? '',
    pendingModerationCount,
  };
}

export async function getOverview() {
  const since = subDays(30);
  const [roleCounts, incidentAllTime, incidentLast30Days, sosAllTime, sosLast30Days, activeHotspots, pendingModerationCount, safeZoneCount, redZoneCount, hotspotRows, incidentRows, sosRows] =
    await Promise.all([
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),
      prisma.communityReport.count(),
      prisma.communityReport.count({ where: { createdAt: { gte: since } } }),
      prisma.sosAlert.count(),
      prisma.sosAlert.count({ where: { createdAt: { gte: since } } }),
      prisma.safetyHotspot.count({ where: { isActive: true } }),
      getPendingModerationCount(),
      prisma.safeZone.count(),
      prisma.redZone.count(),
      prisma.safetyHotspot.findMany({
        select: {
          id: true,
          title: true,
          latitude: true,
          longitude: true,
          riskScore: true,
          reportCount: true,
          city: true,
          state: true,
          assignedPoliceman: {
            select: {
              fullName: true,
              organization: {
                select: { organizationName: true },
              },
            },
          },
        },
        orderBy: [{ isActive: 'desc' }, { riskScore: 'desc' }],
      }),
      prisma.communityReport.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.sosAlert.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

  const chart = buildDailySeries(incidentRows, sosRows, since);
  const groupedRoles = normalizeRoleCounts(roleCounts);

  return {
    roleCounts: groupedRoles,
    totals: {
      incidents: { allTime: incidentAllTime, last30Days: incidentLast30Days },
      sosAlerts: { allTime: sosAllTime, last30Days: sosLast30Days },
      activeHotspots,
      pendingModerationCount,
      safeZones: safeZoneCount,
      redZones: redZoneCount,
    },
    chart,
    hotspotMap: {
      center: INDIA_CENTER,
      markers: hotspotRows.map((hotspot) => ({
        id: hotspot.id,
        name: hotspot.title ?? hotspot.city ?? 'Hotspot',
        latitude: hotspot.latitude,
        longitude: hotspot.longitude,
        severity: getHotspotSeverity(hotspot.riskScore),
        reportCount: hotspot.reportCount,
        city: hotspot.city,
        state: hotspot.state,
        assignedOfficer: hotspot.assignedPoliceman?.fullName ?? null,
        departmentName: hotspot.assignedPoliceman?.organization.organizationName ?? null,
      })),
    },
  };
}

export async function listUsers(query: UserListQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const search = query.search?.trim();
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { isActive: query.status === 'active' } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        isSeed: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: items.map((user) => ({
      ...user,
      isSuspended: !user.isActive,
      status: user.isActive ? 'active' : 'suspended',
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export async function updateUserRole(userId: string, role: UserRole, actorId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      email: true,
      departmentId: true,
      ngoId: true,
    },
  });

  if (!existing) {
    throw new AppError('User not found', 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      departmentId: role === UserRole.POLICEMAN ? existing.departmentId : existing.departmentId,
      ngoId: role === UserRole.VOLUNTEER ? existing.ngoId : existing.ngoId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      isSeed: true,
      createdAt: true,
    },
  });

  await createAuditLog(actorId, 'UPDATED_USER_ROLE', updated.id, { previousRole: existing.role, nextRole: role, email: updated.email }, 'User');
  return updated;
}

export async function toggleUserSuspension(userId: string, isSuspended: boolean, actorId: string) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isActive: true },
  });

  if (!existing) {
    throw new AppError('User not found', 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !isSuspended },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      isSeed: true,
      createdAt: true,
    },
  });

  await createAuditLog(
    actorId,
    isSuspended ? 'SUSPENDED_USER' : 'UNSUSPENDED_USER',
    updated.id,
    { email: updated.email },
    'User'
  );

  return {
    ...updated,
    isSuspended,
    status: isSuspended ? 'suspended' : 'active',
  };
}

export async function deleteUser(userId: string, actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isSeed: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isSeed) {
    throw new AppError('Seed users cannot be deleted', 409);
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    throw new AppError('User cannot be deleted because related records still exist', 409);
  }

  await createAuditLog(actorId, 'DELETED_USER', userId, { email: user.email }, 'User');
  return { id: userId };
}

export async function checkEmailAvailability(email: string) {
  const existing = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true },
  });

  return { exists: Boolean(existing) };
}

export async function listDepartments() {
  const departments = await prisma.user.findMany({
    where: { role: UserRole.POLICE_DEPARTMENT },
    select: {
      id: true,
      fullName: true,
      email: true,
      createdAt: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const items = await Promise.all(
    departments.map(async (department) => {
      const [policemenCount, activeHotspotCount] = await Promise.all([
        prisma.user.count({
          where: { departmentId: department.id, role: UserRole.POLICEMAN, isActive: true },
        }),
        prisma.safetyHotspot.count({
          where: {
            isActive: true,
            assignedPoliceman: {
              organization: {
                createdById: department.id,
                organizationType: OrganizationType.police,
              },
            },
          },
        }),
      ]);

      return {
        id: department.id,
        name: department.fullName,
        email: department.email,
        createdAt: department.createdAt,
        isActive: department.isActive,
        policemenCount,
        activeHotspotCount,
      };
    })
  );

  return { items };
}

export async function listNgos() {
  const ngos = await prisma.user.findMany({
    where: { role: UserRole.NGO },
    select: {
      id: true,
      fullName: true,
      email: true,
      createdAt: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const items = await Promise.all(
    ngos.map(async (ngo) => {
      const volunteerCount = await prisma.user.count({
        where: { ngoId: ngo.id, role: UserRole.VOLUNTEER, isActive: true },
      });

      return {
        id: ngo.id,
        name: ngo.fullName,
        email: ngo.email,
        createdAt: ngo.createdAt,
        isActive: ngo.isActive,
        volunteerCount,
      };
    })
  );

  return { items };
}

export async function deleteDepartment(id: string, actorId: string) {
  return archiveManagedEntity(id, actorId, UserRole.POLICE_DEPARTMENT);
}

export async function deleteNgo(id: string, actorId: string) {
  return archiveManagedEntity(id, actorId, UserRole.NGO);
}

export async function listHotspots() {
  const hotspots = await prisma.safetyHotspot.findMany({
    select: {
      id: true,
      title: true,
      latitude: true,
      longitude: true,
      riskScore: true,
      isActive: true,
      reportCount: true,
      city: true,
      state: true,
      assignedPoliceman: {
        select: {
          fullName: true,
          organization: {
            select: { organizationName: true },
          },
        },
      },
    },
    orderBy: [{ isActive: 'desc' }, { riskScore: 'desc' }, { updatedAt: 'desc' }],
  });

  return {
    items: hotspots.map((hotspot) => ({
      id: hotspot.id,
      name: hotspot.title ?? hotspot.city ?? 'Hotspot',
      lat: hotspot.latitude,
      lng: hotspot.longitude,
      severity: getHotspotSeverity(hotspot.riskScore),
      status: hotspot.isActive ? 'ACTIVE' : 'INACTIVE',
      assignedPolicemanName: hotspot.assignedPoliceman?.fullName ?? null,
      departmentName: hotspot.assignedPoliceman?.organization.organizationName ?? null,
      reportCount: hotspot.reportCount,
      city: hotspot.city,
      state: hotspot.state,
    })),
  };
}

export async function getHotspotDetail(id: string) {
  const hotspot = await prisma.safetyHotspot.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      latitude: true,
      longitude: true,
      riskScore: true,
      isActive: true,
      city: true,
      state: true,
      reportCount: true,
      assignedAt: true,
      assignedPoliceman: {
        select: {
          id: true,
          fullName: true,
          email: true,
          organization: {
            select: { organizationName: true },
          },
        },
      },
    },
  });

  if (!hotspot) {
    throw new AppError('Hotspot not found', 404);
  }

  const [nearbyIncidents, auditRows] = await Promise.all([
    prisma.communityReport.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        entityId: hotspot.id,
        entityType: 'SafetyHotspot',
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

  const incidentCount = nearbyIncidents.filter((item) =>
    haversineDistance(hotspot.latitude, hotspot.longitude, item.latitude, item.longitude) <= HOTSPOT_MATCH_RADIUS_KM
  ).length;

  const assignmentHistory = [
    ...(hotspot.assignedPoliceman
      ? [
          {
            action: 'CURRENT_ASSIGNMENT',
            assignedAt: hotspot.assignedAt ?? undefined,
            officerName: hotspot.assignedPoliceman.fullName,
            departmentName: hotspot.assignedPoliceman.organization.organizationName,
          },
        ]
      : []),
    ...auditRows.map((row) => ({
      action: row.action,
      assignedAt: row.createdAt,
      details: row.metadata,
    })),
  ];

  return {
    id: hotspot.id,
    name: hotspot.title ?? hotspot.city ?? 'Hotspot',
    description: hotspot.description,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    severity: getHotspotSeverity(hotspot.riskScore),
    status: hotspot.isActive ? 'ACTIVE' : 'INACTIVE',
    assignedOfficer: hotspot.assignedPoliceman
      ? {
          id: hotspot.assignedPoliceman.id,
          name: hotspot.assignedPoliceman.fullName,
          email: hotspot.assignedPoliceman.email,
          departmentName: hotspot.assignedPoliceman.organization.organizationName,
        }
      : null,
    incidentCount,
    assignmentHistory,
  };
}

export async function updateHotspotStatus(id: string, status: 'ACTIVE' | 'INACTIVE', actorId: string) {
  const hotspot = await prisma.safetyHotspot.findUnique({
    where: { id },
    select: { id: true, isActive: true, title: true },
  });

  if (!hotspot) {
    throw new AppError('Hotspot not found', 404);
  }

  const nextActive = status === 'ACTIVE';
  const updated = await prisma.safetyHotspot.update({
    where: { id },
    data: { isActive: nextActive },
    select: {
      id: true,
      title: true,
      isActive: true,
      riskScore: true,
    },
  });

  await createAuditLog(
    actorId,
    nextActive ? 'ACTIVATED_HOTSPOT' : 'DEACTIVATED_HOTSPOT',
    id,
    { previousStatus: hotspot.isActive ? 'ACTIVE' : 'INACTIVE', nextStatus: status, title: hotspot.title },
    'SafetyHotspot'
  );

  return {
    ...updated,
    status: updated.isActive ? 'ACTIVE' : 'INACTIVE',
    severity: getHotspotSeverity(updated.riskScore),
  };
}

export async function getSosAnalytics() {
  const since = subDays(30);
  const [alerts, histories, hotspots] = await Promise.all([
    prisma.sosAlert.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        createdAt: true,
        triggerLatitude: true,
        triggerLongitude: true,
        triggerAddress: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.alertStatusHistory.findMany({
      where: { createdAt: { gte: since } },
      select: {
        alertId: true,
        changedByRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.safetyHotspot.findMany({
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
      },
    }),
  ]);

  const byDay = buildSingleSeries(alerts, since);
  const byRegion = Object.entries(
    alerts.reduce<Record<string, number>>((acc, alert) => {
      const key = normalizeRegion(alert.triggerAddress);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  const responseDurations = new Map<string, Date>();
  histories.forEach((history) => {
    if (responseDurations.has(history.alertId)) return;
    if (history.changedByRole !== UserRole.POLICEMAN && history.changedByRole !== UserRole.VOLUNTEER) return;
    responseDurations.set(history.alertId, history.createdAt);
  });

  const responseTimeValues = alerts
    .map((alert) => {
      const acknowledgedAt = responseDurations.get(alert.id);
      return acknowledgedAt ? acknowledgedAt.getTime() - alert.createdAt.getTime() : null;
    })
    .filter((value): value is number => value !== null);

  const averageResponseTimeMinutes = responseTimeValues.length
    ? Number((responseTimeValues.reduce((sum, value) => sum + value, 0) / responseTimeValues.length / 60000).toFixed(1))
    : null;

  const hotspotCounts = hotspots
    .map((hotspot) => ({
      id: hotspot.id,
      name: hotspot.title ?? 'Hotspot',
      count: alerts.filter(
        (alert) =>
          alert.triggerLatitude !== null &&
          alert.triggerLongitude !== null &&
          haversineDistance(hotspot.latitude, hotspot.longitude, alert.triggerLatitude, alert.triggerLongitude) <= HOTSPOT_MATCH_RADIUS_KM
      ).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    byDay,
    byRegion,
    averageResponseTimeMinutes,
    averageResponseTimeFutureFieldNote: averageResponseTimeMinutes === null ? 'No responder acknowledgment history is available yet for this period.' : null,
    topHotspots: hotspotCounts,
    mapPoints: alerts
      .filter((alert) => alert.triggerLatitude !== null && alert.triggerLongitude !== null)
      .map((alert) => ({
        id: alert.id,
        latitude: alert.triggerLatitude as number,
        longitude: alert.triggerLongitude as number,
        label: normalizeRegion(alert.triggerAddress),
      })),
  };
}

export async function getModerationQueue() {
  const { items, totalCount } = await buildModerationQueue();
  return { items, totalCount };
}

export async function dismissModerationItem(id: string, type: ModerationItemType, actorId: string) {
  const entityType = type === 'incident' ? 'CommunityReport' : 'ReportComment';
  await createAuditLog(actorId, type === 'incident' ? 'DISMISSED_MODERATION_INCIDENT' : 'DISMISSED_MODERATION_COMMENT', id, { type }, entityType);
  return { id, type, dismissed: true };
}

export async function deleteModerationIncident(id: string, actorId: string) {
  const report = await prisma.communityReport.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!report) {
    throw new AppError('Incident not found', 404);
  }

  await prisma.communityReport.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog(actorId, 'REMOVED_MODERATION_INCIDENT', id, { title: report.title ?? null }, 'CommunityReport');
  return { id };
}

export async function deleteModerationComment(id: string, actorId: string) {
  const comment = await prisma.reportComment.findUnique({
    where: { id },
    select: { id: true, content: true },
  });

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  await prisma.reportComment.delete({ where: { id } });
  await createAuditLog(actorId, 'REMOVED_MODERATION_COMMENT', id, { preview: comment.content.slice(0, 100) }, 'ReportComment');
  return { id };
}

export async function banModerationUser(id: string, actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, isActive: true },
  });

  if (!user) {
    throw new AppError('Author not found', 404);
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await createAuditLog(actorId, 'BANNED_MODERATION_AUTHOR', id, { email: user.email }, 'User');
  return { id, email: user.email };
}

export async function getAuditLog(query: AuditLogQuery) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const where: Prisma.AuditLogWhereInput = query.action
    ? { action: query.action }
    : {};

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        entityId: true,
        entityType: true,
        metadata: true,
        createdAt: true,
        actor: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      timestamp: item.createdAt,
      actorName: item.actor?.fullName ?? 'System',
      actorEmail: item.actor?.email ?? '',
      action: item.action,
      target: item.entityId ?? '',
      details: item.metadata,
      entityType: item.entityType,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

async function archiveManagedEntity(id: string, actorId: string, role: 'POLICE_DEPARTMENT' | 'NGO') {
  const user = await prisma.user.findFirst({
    where: { id, role },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new AppError(`${role === UserRole.POLICE_DEPARTMENT ? 'Department' : 'NGO'} not found`, 404);
  }

  if (role === UserRole.POLICE_DEPARTMENT) {
    const activeAssignments = await prisma.safetyHotspot.count({
      where: {
        isActive: true,
        assignedPoliceman: {
          organization: {
            createdById: id,
            organizationType: OrganizationType.police,
          },
        },
      },
    });

    if (activeAssignments > 0) {
      throw new AppError('Department has active hotspot assignments and cannot be deleted yet', 409);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await tx.organization.updateMany({
      where: {
        createdById: id,
        organizationType: role === UserRole.POLICE_DEPARTMENT ? OrganizationType.police : OrganizationType.ngo,
      },
      data: {
        status: OrganizationStatus.suspended,
        suspendedAt: new Date(),
      },
    });

    await createAuditLog(
      actorId,
      role === UserRole.POLICE_DEPARTMENT ? 'ARCHIVED_POLICE_DEPARTMENT' : 'ARCHIVED_NGO',
      id,
      { email: user.email, name: user.fullName },
      'User',
      tx
    );
  });

  return { id };
}

async function buildModerationQueue() {
  const flaggedReports = await prisma.communityReport.findMany({
    where: getFlaggedReportWhere(),
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      score: true,
      upvoteCount: true,
      alertSent: true,
      isVerified: true,
      createdAt: true,
      reporter: {
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
        },
      },
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: [{ alertSent: 'desc' }, { score: 'desc' }, { createdAt: 'desc' }],
  });

  const resolved = await getResolvedModerationState();
  const incidentItems = flaggedReports
    .filter((report) => !resolved.incidents.has(report.id))
    .map((report) => ({
      id: report.id,
      type: 'incident' as const,
      contentPreview: truncateContent(report.title ? `${report.title}: ${report.description ?? ''}` : report.description ?? 'Untitled report'),
      reporterCount: Math.max(1, report.upvoteCount + (report.alertSent ? 1 : 0) + (report.isVerified ? 0 : 1)),
      flaggedReason: deriveFlaggedReason(report.alertSent, report.isVerified, report.score),
      author: {
        id: report.reporter?.id ?? '',
        name: report.reporter?.fullName ?? 'Anonymous reporter',
        email: report.reporter?.email ?? '',
        isActive: report.reporter?.isActive ?? true,
      },
      createdAt: report.createdAt,
    }));

  const commentItems = flaggedReports
    .flatMap((report) =>
      report.comments.map((comment) => ({
        reportId: report.id,
        reportScore: report.score,
        reportUpvotes: report.upvoteCount,
        reportAlertSent: report.alertSent,
        reportIsVerified: report.isVerified,
        comment,
      }))
    )
    .filter((row) => !resolved.comments.has(row.comment.id))
    .map((row) => ({
      id: row.comment.id,
      type: 'comment' as const,
      contentPreview: truncateContent(row.comment.content),
      reporterCount: Math.max(1, row.reportUpvotes + (row.reportAlertSent ? 1 : 0) + (row.reportIsVerified ? 0 : 1)),
      flaggedReason: `Comment linked to flagged report: ${deriveFlaggedReason(row.reportAlertSent, row.reportIsVerified, row.reportScore)}`,
      author: {
        id: row.comment.user.id,
        name: row.comment.user.fullName,
        email: row.comment.user.email,
        isActive: row.comment.user.isActive,
      },
      createdAt: row.comment.createdAt,
    }));

  const items = [...incidentItems, ...commentItems].sort((a, b) => {
    if (b.reporterCount !== a.reporterCount) return b.reporterCount - a.reporterCount;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return {
    items,
    totalCount: items.length,
  };
}

async function getPendingModerationCount() {
  const queue = await buildModerationQueue();
  return queue.totalCount;
}

async function getResolvedModerationState() {
  const actions = await prisma.auditLog.findMany({
    where: {
      action: {
        in: [
          'DISMISSED_MODERATION_INCIDENT',
          'DISMISSED_MODERATION_COMMENT',
          'REMOVED_MODERATION_INCIDENT',
          'REMOVED_MODERATION_COMMENT',
        ],
      },
      entityId: { not: null },
    },
    select: {
      action: true,
      entityId: true,
    },
  });

  const incidents = new Set<string>();
  const comments = new Set<string>();

  actions.forEach((action) => {
    if (!action.entityId) return;
    if (action.action.endsWith('INCIDENT')) incidents.add(action.entityId);
    if (action.action.endsWith('COMMENT')) comments.add(action.entityId);
  });

  return { incidents, comments };
}

function getFlaggedReportWhere(): Prisma.CommunityReportWhereInput {
  return {
    isActive: true,
    OR: [
      { alertSent: true },
      { isVerified: false },
      { score: { gte: MODERATION_REPORT_THRESHOLD } },
    ],
  };
}

function deriveFlaggedReason(alertSent: boolean, isVerified: boolean, score: number) {
  if (alertSent) return 'Alert escalated from community report';
  if (!isVerified) return 'Awaiting verification';
  return `High risk score (${score})`;
}

function truncateContent(value: string, maxLength = 100) {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function buildDailySeries(
  incidentRows: Array<{ createdAt: Date }>,
  sosRows: Array<{ createdAt: Date }>,
  since: Date
) {
  const base = createDateBuckets(since);
  incidentRows.forEach((row) => {
    const key = formatDay(row.createdAt);
    if (base[key]) base[key].incidents += 1;
  });
  sosRows.forEach((row) => {
    const key = formatDay(row.createdAt);
    if (base[key]) base[key].sosAlerts += 1;
  });
  return Object.values(base);
}

function buildSingleSeries(rows: Array<{ createdAt: Date }>, since: Date) {
  const base = createDateBuckets(since);
  rows.forEach((row) => {
    const key = formatDay(row.createdAt);
    if (base[key]) base[key].sosAlerts += 1;
  });
  return Object.values(base).map((item) => ({ date: item.date, count: item.sosAlerts }));
}

function createDateBuckets(since: Date) {
  const buckets: Record<string, { date: string; incidents: number; sosAlerts: number }> = {};
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = subDays(offset);
    const key = formatDay(date);
    buckets[key] = { date: key, incidents: 0, sosAlerts: 0 };
  }
  return buckets;
}

function subDays(days: number, from = new Date()) {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeRoleCounts(rows: Array<{ role: UserRole; _count: { role: number } }>) {
  const base = {
    SUPERADMIN: 0,
    POLICE_DEPARTMENT: 0,
    POLICEMAN: 0,
    NGO: 0,
    VOLUNTEER: 0,
    USER: 0,
  };

  rows.forEach((row) => {
    switch (row.role) {
      case UserRole.SUPERADMIN:
      case UserRole.super_admin:
      case UserRole.admin:
        base.SUPERADMIN += row._count.role;
        break;
      case UserRole.POLICE_DEPARTMENT:
      case UserRole.department:
        base.POLICE_DEPARTMENT += row._count.role;
        break;
      case UserRole.POLICEMAN:
      case UserRole.police:
        base.POLICEMAN += row._count.role;
        break;
      case UserRole.NGO:
      case UserRole.organization_admin:
        base.NGO += row._count.role;
        break;
      case UserRole.VOLUNTEER:
      case UserRole.volunteer:
      case UserRole.worker:
        base.VOLUNTEER += row._count.role;
        break;
      default:
        base.USER += row._count.role;
        break;
    }
  });

  return base;
}

function getHotspotSeverity(riskScore: Prisma.Decimal | number) {
  const score = Number(riskScore);
  if (score >= 7.5) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

function normalizeRegion(address?: string | null) {
  if (!address) return 'Unknown';
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.slice(-2).join(', ') || address;
}
