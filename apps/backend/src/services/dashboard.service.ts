import { OrganizationType, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export async function getSuperadminOverview() {
  const [users, departments, ngos, hotspots, alerts, reports, redZones] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.POLICE_DEPARTMENT } }),
    prisma.user.count({ where: { role: UserRole.NGO } }),
    prisma.safetyHotspot.count({ where: { isActive: true } }),
    prisma.sosAlert.count(),
    prisma.communityReport.count({ where: { isActive: true } }),
    prisma.redZone.count(),
  ]);

  return {
    metrics: [
      { label: 'Total users', value: users },
      { label: 'Police departments', value: departments },
      { label: 'NGOs', value: ngos },
      { label: 'Active hotspots', value: hotspots },
      { label: 'SOS alerts', value: alerts },
      { label: 'Community reports', value: reports },
      { label: 'Red zones', value: redZones },
    ],
  };
}

export async function listAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function setUserStatus(userId: string, isActive: boolean, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      action: isActive ? 'REACTIVATED_USER' : 'SUSPENDED_USER',
      entityType: 'User',
      entityId: userId,
      metadata: { email: updated.email, role: updated.role },
    },
  });

  return updated;
}

export async function getModerationQueue() {
  return prisma.communityReport.findMany({
    where: {
      isActive: true,
      OR: [{ isVerified: false }, { score: { gte: 5 } }, { alertSent: true }],
    },
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      city: true,
      score: true,
      pinColor: true,
      isVerified: true,
      alertSent: true,
      createdAt: true,
      reporter: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: [{ alertSent: 'desc' }, { score: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });
}

export async function getHotspotOversight() {
  return prisma.safetyHotspot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      riskScore: true,
      reportCount: true,
      verifiedCount: true,
      assignedAt: true,
      assignedPoliceman: {
        select: {
          id: true,
          fullName: true,
          email: true,
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: [{ riskScore: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function getSuperadminAnalytics() {
  const [alertsByStatus, alertsByType, reportsByColor, recentAlerts] = await Promise.all([
    prisma.sosAlert.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.sosAlert.groupBy({
      by: ['alertType'],
      _count: { alertType: true },
    }),
    prisma.communityReport.groupBy({
      by: ['pinColor'],
      _count: { pinColor: true },
    }),
    prisma.sosAlert.findMany({
      select: {
        id: true,
        alertType: true,
        status: true,
        severity: true,
        triggerAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    alertsByStatus,
    alertsByType,
    reportsByColor,
    recentAlerts,
  };
}

export async function getAuditLogs() {
  return prisma.auditLog.findMany({
    select: {
      id: true,
      actorRole: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

export async function getDepartmentOverview(departmentUserId: string) {
  const organization = await getOwnedOrganization(departmentUserId, OrganizationType.police);
  const [policemen, hotspots, zones, activeAlerts, recentAssignments] = await Promise.all([
    prisma.user.count({ where: { departmentId: departmentUserId, role: UserRole.POLICEMAN } }),
    prisma.safetyHotspot.count({
      where: {
        assignedPoliceman: {
          organizationId: organization.id,
        },
      },
    }),
    prisma.safeZone.count({ where: { departmentId: organization.id, isActive: true } }),
    prisma.sosAlert.count({ where: { status: { in: ['pending', 'active', 'accepted', 'escalated'] } } }),
    prisma.safetyHotspot.findMany({
      where: {
        assignedPoliceman: {
          organizationId: organization.id,
        },
      },
      select: {
        id: true,
        title: true,
        city: true,
        riskScore: true,
        assignedAt: true,
        assignedPoliceman: {
          select: {
            fullName: true,
            user: { select: { fullName: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    metrics: [
      { label: 'Policemen', value: policemen },
      { label: 'Assigned hotspots', value: hotspots },
      { label: 'Safe zones', value: zones },
      { label: 'Active SOS feed', value: activeAlerts },
    ],
    recentAssignments,
  };
}

export async function getDepartmentAssignments(departmentUserId: string) {
  const organization = await getOwnedOrganization(departmentUserId, OrganizationType.police);
  const [policemen, hotspots] = await Promise.all([
    prisma.worker.findMany({
      where: {
        organizationId: organization.id,
        workerType: 'police_officer',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.safetyHotspot.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        category: true,
        city: true,
        state: true,
        riskScore: true,
        assignedAt: true,
        assignedPolicemanId: true,
      },
      orderBy: [{ riskScore: 'desc' }, { updatedAt: 'desc' }],
      take: 100,
    }),
  ]);

  return { policemen, hotspots };
}

export async function getDepartmentActivity(departmentUserId: string) {
  const policemen = await prisma.user.findMany({
    where: { departmentId: departmentUserId, role: UserRole.POLICEMAN },
    select: { id: true },
  });

  return prisma.auditLog.findMany({
    where: {
      OR: [{ actorId: departmentUserId }, { actorId: { in: policemen.map((item) => item.id) } }],
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      metadata: true,
      createdAt: true,
      actor: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getNgoOverview(ngoUserId: string) {
  const [volunteers, activeAlerts, safeZones, recentVolunteers] = await Promise.all([
    prisma.user.count({ where: { ngoId: ngoUserId, role: UserRole.VOLUNTEER } }),
    prisma.sosAlert.count({ where: { status: { in: ['pending', 'active', 'accepted'] } } }),
    prisma.safeZone.count({ where: { isActive: true } }),
    prisma.user.findMany({
      where: { ngoId: ngoUserId, role: UserRole.VOLUNTEER },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return {
    metrics: [
      { label: 'Volunteers', value: volunteers },
      { label: 'Active SOS feed', value: activeAlerts },
      { label: 'Visible safe zones', value: safeZones },
    ],
    recentVolunteers,
  };
}

export async function getNgoResponse(ngoUserId: string) {
  const volunteers = await prisma.volunteer.findMany({
    where: {
      user: { ngoId: ngoUserId },
    },
    select: {
      id: true,
      status: true,
      serviceRadiusKm: true,
      totalResponses: true,
      verificationStatus: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const alerts = await prisma.sosAlert.findMany({
    where: {
      status: { in: ['pending', 'active', 'accepted'] },
    },
    select: {
      id: true,
      alertCode: true,
      alertType: true,
      status: true,
      severity: true,
      triggerAddress: true,
      createdAt: true,
      assignedVolunteer: {
        select: {
          id: true,
          user: {
            select: { fullName: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  return { volunteers, alerts };
}

export async function getNgoActivity(ngoUserId: string) {
  const volunteers = await prisma.user.findMany({
    where: { ngoId: ngoUserId, role: UserRole.VOLUNTEER },
    select: { id: true },
  });

  return prisma.auditLog.findMany({
    where: {
      OR: [{ actorId: ngoUserId }, { actorId: { in: volunteers.map((item) => item.id) } }],
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      metadata: true,
      createdAt: true,
      actor: { select: { fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getPolicemanOverview(userId: string) {
  const [myHotspots, activeAlerts, incidents, profile] = await Promise.all([
    prisma.safetyHotspot.findMany({
      where: {
        assignedPoliceman: {
          userId,
        },
      },
      select: {
        id: true,
        title: true,
        city: true,
        state: true,
        riskScore: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.sosAlert.count({ where: { status: { in: ['pending', 'active', 'accepted', 'escalated'] } } }),
    prisma.communityReport.count({ where: { isActive: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true, policeDepartment: { select: { fullName: true } } },
    }),
  ]);

  return {
    profile,
    metrics: [
      { label: 'Assigned hotspots', value: myHotspots.length },
      { label: 'Active SOS alerts', value: activeAlerts },
      { label: 'Nearby incidents', value: incidents },
    ],
    hotspots: myHotspots,
  };
}

export async function getPolicemanHotspot(userId: string) {
  return prisma.safetyHotspot.findMany({
    where: {
      assignedPoliceman: {
        userId,
      },
    },
    select: {
      id: true,
      title: true,
      category: true,
      city: true,
      state: true,
      description: true,
      latitude: true,
      longitude: true,
      riskScore: true,
      reportCount: true,
      verifiedCount: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getVolunteerOverview(userId: string) {
  const [cases, alerts, profile] = await Promise.all([
    prisma.sosAlert.count({
      where: {
        assignedVolunteer: {
          userId,
        },
      },
    }),
    prisma.sosAlert.count({ where: { status: { in: ['pending', 'active'] } } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true, ngo: { select: { fullName: true } } },
    }),
  ]);

  return {
    profile,
    metrics: [
      { label: 'Assigned cases', value: cases },
      { label: 'Open SOS alerts', value: alerts },
    ],
  };
}

export async function getVolunteerCases(userId: string) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!volunteer) {
    throw new AppError('Volunteer profile not found', 404);
  }

  return prisma.sosAlert.findMany({
    where: { assignedVolunteerId: volunteer.id },
    select: {
      id: true,
      alertCode: true,
      alertType: true,
      status: true,
      severity: true,
      triggerAddress: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createOfficialReport(userId: string, input: {
  title: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}) {
  const report = await prisma.communityReport.create({
    data: {
      reporterId: userId,
      isAnonymous: false,
      category: input.category as never,
      title: input.title,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      city: input.city,
      score: 0,
      pinColor: 'white',
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'SUBMITTED_OFFICIAL_REPORT',
      entityType: 'CommunityReport',
      entityId: report.id,
      metadata: { title: report.title, category: report.category },
    },
  });

  return report;
}

export async function createVolunteerCheckIn(userId: string, input: { caseId: string; latitude: number; longitude: number; notes?: string }) {
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'VOLUNTEER_CHECK_IN',
      entityType: 'SosAlert',
      entityId: input.caseId,
      metadata: {
        latitude: input.latitude,
        longitude: input.longitude,
        notes: input.notes ?? null,
      },
    },
  });

  return {
    caseId: input.caseId,
    latitude: input.latitude,
    longitude: input.longitude,
    notes: input.notes ?? null,
    checkedInAt: new Date().toISOString(),
  };
}

async function getOwnedOrganization(userId: string, organizationType: OrganizationType) {
  const organization = await prisma.organization.findFirst({
    where: {
      createdById: userId,
      organizationType,
    },
  });

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  return organization;
}
