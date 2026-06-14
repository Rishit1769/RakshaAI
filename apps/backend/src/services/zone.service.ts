import { OrganizationType, UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface ZoneActor {
  id: string;
  role: UserRole;
  departmentId: string | null;
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
  const department = await resolveTargetDepartment(actor, input.departmentId);

  return prisma.safeZone.create({
    data: {
      name: input.name,
      type: department.organizationType,
      departmentId: department.id,
      departmentType: department.organizationType,
      latitude: input.center.latitude,
      longitude: input.center.longitude,
      radiusMeters: input.radius,
      isActive: true,
      isVerified: true,
      addedBy: actor.id,
    },
  });
}

export async function listZones(actor: ZoneActor) {
  if (actor.role === UserRole.admin || actor.role === UserRole.super_admin) {
    return prisma.safeZone.findMany({
      include: {
        department: {
          select: { id: true, organizationName: true, organizationType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!actor.departmentId) {
    throw new AppError('Department association not found', 403);
  }

  return prisma.safeZone.findMany({
    where: { departmentId: actor.departmentId },
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

  ensureZoneAccess(actor, zone.departmentId);

  return prisma.safeZone.update({
    where: { id: zoneId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.center ? { latitude: input.center.latitude, longitude: input.center.longitude } : {}),
      ...(input.radius !== undefined ? { radiusMeters: input.radius } : {}),
    },
  });
}

export async function deleteZone(actor: ZoneActor, zoneId: string) {
  const zone = await prisma.safeZone.findUnique({ where: { id: zoneId } });
  if (!zone) throw new AppError('Zone not found', 404);

  ensureZoneAccess(actor, zone.departmentId);
  await prisma.safeZone.delete({ where: { id: zoneId } });
}

async function resolveTargetDepartment(actor: ZoneActor, requestedDepartmentId?: string) {
  const departmentId =
    actor.role === UserRole.department ? actor.departmentId : requestedDepartmentId;

  if (!departmentId) {
    throw new AppError('departmentId is required to create a zone', 400);
  }

  const department = await prisma.organization.findUnique({
    where: { id: departmentId },
  });

  if (!department) throw new AppError('Department not found', 404);
  return department;
}

function ensureZoneAccess(actor: ZoneActor, departmentId: string | null) {
  if (actor.role === UserRole.admin || actor.role === UserRole.super_admin) {
    return;
  }

  if (!actor.departmentId || actor.departmentId !== departmentId) {
    throw new AppError('You cannot manage zones for another department', 403);
  }

  if (actor.role !== UserRole.department) {
    throw new AppError('Only department accounts can manage zones', 403);
  }
}
