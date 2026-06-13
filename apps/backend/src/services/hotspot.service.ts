import { OrganizationType, UserRole, WorkerType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export async function assignPolicemanToHotspot(
  departmentUserId: string,
  policemanWorkerId: string,
  hotspotAreaId: string
) {
  const requester = await prisma.user.findUnique({
    where: { id: departmentUserId },
    select: { id: true, role: true },
  });

  if (!requester) {
    throw new AppError('Requesting user not found', 404);
  }

  if (requester.role !== UserRole.organization_admin) {
    throw new AppError('Only police department users can assign policemen to hotspots', 403);
  }

  const policeOrganization = await prisma.organization.findFirst({
    where: {
      createdById: departmentUserId,
      organizationType: OrganizationType.police,
      status: 'approved',
    },
    select: { id: true, organizationName: true },
  });

  if (!policeOrganization) {
    throw new AppError('Police department organization not found for this user', 403);
  }

  const policeman = await prisma.worker.findUnique({
    where: { id: policemanWorkerId },
    include: {
      organization: {
        select: {
          id: true,
          organizationName: true,
          organizationType: true,
        },
      },
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  if (!policeman) {
    throw new AppError('Policeman worker not found', 404);
  }

  if (policeman.workerType !== WorkerType.police_officer) {
    throw new AppError('Target worker is not a policeman', 400);
  }

  if (policeman.organizationId !== policeOrganization.id) {
    throw new AppError('Policeman worker does not belong to your police department', 403);
  }

  const hotspot = await prisma.safetyHotspot.findUnique({
    where: { id: hotspotAreaId },
    select: { id: true },
  });

  if (!hotspot) {
    throw new AppError('Hotspot area not found', 404);
  }

  return prisma.safetyHotspot.update({
    where: { id: hotspotAreaId },
    data: {
      assignedPolicemanId: policemanWorkerId,
      assignedAt: new Date(),
    },
    include: {
      assignedPoliceman: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          workerType: true,
          customRole: true,
          isActive: true,
          organization: {
            select: {
              id: true,
              organizationName: true,
              organizationType: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      },
    },
  });
}
