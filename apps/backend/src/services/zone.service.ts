import { OrganizationType, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface ZoneActor {
  id: string;
  role: UserRole;
  departmentId: string | null;
  ngoId?: string | null;
}

export interface CreateZoneInput {
  name: string;
  departmentId?: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
}

export interface UpdateZoneInput {
  name?: string;
  center?: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
}

export async function createZone(actor: ZoneActor, input: CreateZoneInput) {
  const organization = await resolveTargetOrganization(actor, input.departmentId);

  return prisma.safeZone.create({
    data: {
      name: input.name,
      type: organization.organizationType,
      departmentId: organization.id,
      departmentType: organization.organizationType,
      latitude: input.center.latitude,
      longitude: input.center.longitude,
      radiusMeters: input.radius,
      isActive: true,
      isVerified: true,
      addedBy: actor.id,
    },
    include: {
      department: {
        select: { id: true, organizationName: true, organizationType: true },
      },
    },
  });
}

export async function listZones(actor: ZoneActor) {
  if (isAdminRole(actor.role)) {
    return prisma.safeZone.findMany({
      include: {
        department: {
          select: { id: true, organizationName: true, organizationType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (actor.role === UserRole.NGO) {
    return prisma.safeZone.findMany({
      include: {
        department: {
          select: { id: true, organizationName: true, organizationType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  const organization = await resolveOrganizationForActor(actor);
  return prisma.safeZone.findMany({
    where: { departmentId: organization.id },
    include: {
      department: {
        select: { id: true, organizationName: true, organizationType: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateZone(actor: ZoneActor, zoneId: string, input: UpdateZoneInput) {
  const zone = await prisma.safeZone.findUnique({ where: { id: zoneId } });
  if (!zone) throw new AppError('Zone not found', 404);

  await ensureZoneAccess(actor, zone.departmentId);

  return prisma.safeZone.update({
    where: { id: zoneId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.center ? { latitude: input.center.latitude, longitude: input.center.longitude } : {}),
      ...(input.radius !== undefined ? { radiusMeters: input.radius } : {}),
    },
    include: {
      department: {
        select: { id: true, organizationName: true, organizationType: true },
      },
    },
  });
}

export async function deleteZone(actor: ZoneActor, zoneId: string) {
  const zone = await prisma.safeZone.findUnique({ where: { id: zoneId } });
  if (!zone) throw new AppError('Zone not found', 404);

  await ensureZoneAccess(actor, zone.departmentId);
  await prisma.safeZone.delete({ where: { id: zoneId } });
}

async function resolveTargetOrganization(actor: ZoneActor, requestedOrganizationId?: string) {
  if (isAdminRole(actor.role)) {
    if (!requestedOrganizationId) {
      throw new AppError('departmentId is required to create a zone', 400);
    }

    const organization = await prisma.organization.findUnique({
      where: { id: requestedOrganizationId },
    });

    if (!organization) throw new AppError('Department not found', 404);
    return organization;
  }

  return resolveOrganizationForActor(actor);
}

async function resolveOrganizationForActor(actor: ZoneActor) {
  const organizationType =
    actor.role === UserRole.POLICE_DEPARTMENT
      ? OrganizationType.police
      : actor.role === UserRole.NGO
        ? OrganizationType.ngo
        : null;

  if (!organizationType) {
    throw new AppError('Only department or NGO accounts can manage zones', 403);
  }

  const organization = await prisma.organization.findFirst({
    where: {
      createdById: actor.id,
      organizationType,
    },
  });

  if (!organization) {
    throw new AppError('Organization association not found', 403);
  }

  return organization;
}

async function ensureZoneAccess(actor: ZoneActor, organizationId: string | null) {
  if (isAdminRole(actor.role)) {
    return;
  }

  if (actor.role === UserRole.NGO) {
    throw new AppError('NGO accounts can only view zones', 403);
  }

  const organization = await resolveOrganizationForActor(actor);
  if (organization.id !== organizationId) {
    throw new AppError('You cannot manage zones for another department', 403);
  }
}

function isAdminRole(role: UserRole) {
  return role === UserRole.SUPERADMIN || role === UserRole.super_admin || role === UserRole.admin;
}
