import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { isWithinRadius } from '../utils/haversine';
import { sendRedZoneAlertEmails } from './emailService';

export interface TriggerRedZoneInput {
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export async function triggerRedZone(
  actor: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    role: UserRole;
  },
  input: TriggerRedZoneInput
) {
  const zones = await prisma.safeZone.findMany({
    where: {
      isActive: true,
      departmentId: { not: null },
    },
    include: {
      department: {
        select: {
          id: true,
          organizationName: true,
          organizationType: true,
          email: true,
        },
      },
    },
  });

  const nearbyZones = zones.filter((zone) =>
    isWithinRadius(
      { latitude: zone.latitude, longitude: zone.longitude },
      { latitude: input.latitude, longitude: input.longitude },
      env.RED_ZONE_ALERT_RADIUS_KM
    )
  );

  const departmentMap = new Map<string, {
    id: string;
    name: string;
    email: string;
  }>();

  for (const zone of nearbyZones) {
    if (!zone.department) continue;

    const departmentEmail = zone.department.email ?? null;
    if (!departmentEmail) continue;

    departmentMap.set(zone.department.id, {
      id: zone.department.id,
      name: zone.department.organizationName,
      email: departmentEmail,
    });
  }

  const notifiedDepartmentIds = [...departmentMap.keys()];

  const redZone = await prisma.redZone.create({
    data: {
      triggeredById: actor.id,
      latitude: input.latitude,
      longitude: input.longitude,
      severity: input.severity,
      description: input.description,
      notifiedDepartments: notifiedDepartmentIds.length
        ? {
            connect: notifiedDepartmentIds.map((id) => ({ id })),
          }
        : undefined,
    },
    include: {
      notifiedDepartments: {
        select: { id: true, organizationName: true },
      },
    },
  });

  void sendRedZoneNotifications(
    [...departmentMap.values()],
    {
      latitude: input.latitude,
      longitude: input.longitude,
      severity: input.severity,
      description: input.description,
      triggeredAt: redZone.triggeredAt,
      triggeredBy: {
        fullName: actor.fullName,
        email: actor.email,
        phone: actor.phone,
      },
    }
  );

  return redZone;
}

async function sendRedZoneNotifications(
  departments: Array<{ id: string; name: string; email: string }>,
  payload: {
    latitude: number;
    longitude: number;
    severity: 'low' | 'medium' | 'high';
    description: string;
    triggeredAt: Date;
    triggeredBy: {
      fullName: string;
      email: string;
      phone: string;
    };
  }
) {
  try {
    await sendRedZoneAlertEmails(
      departments.map((department) => ({
        departmentName: department.name,
        departmentEmail: department.email,
        severity: payload.severity,
        description: payload.description,
        latitude: payload.latitude,
        longitude: payload.longitude,
        triggeredAt: payload.triggeredAt,
        triggeredBy: payload.triggeredBy,
      }))
    );
  } catch (error) {
    logger.error('Failed to deliver red zone alert emails', { error });
  }
}
