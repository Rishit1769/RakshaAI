import { AlertType, AlertStatus, SosTriggerMethod, IncidentSeverity } from '@prisma/client';
import { prisma } from '../config/database';
import { generateAlertCode } from '../utils/helpers';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger';
import { emitSOSCreated, emitAlertStatusChanged } from '../sockets';
import { emitDepartmentScopedSosNotification } from './department.service';
import { emitNgoScopedSosNotification } from './ngo.service';
import { emitOfficerScopedSosNotification } from './officer.service';
import { sendSOSAlert } from './emailService';

export interface CreateSosInput {
  userId: string;
  triggerMethod: SosTriggerMethod;
  alertType?: AlertType;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  description?: string;
  address?: string;
}

export interface UpdateSosStatusInput {
  alertId: string;
  userId: string;
  userRole: string;
  newStatus: AlertStatus;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

interface ResolvedSosLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'live' | 'last_known';
}

/**
 * Creates a new SOS alert. This is the highest-priority operation in the system.
 * Must succeed fast - AI classification and notification happen asynchronously.
 */
export async function createSosAlert(input: CreateSosInput) {
  const { userId, triggerMethod, alertType, location, description, address } = input;
  const resolvedLocation = await resolveSosLocation(userId, location);

  const alertCode = generateAlertCode();

  const alert = await prisma.sosAlert.create({
    data: {
      alertCode,
      userId,
      triggerMethod,
      alertType: alertType ?? AlertType.general_danger,
      status: AlertStatus.pending,
      severity: IncidentSeverity.high,
      description,
      triggerLatitude: resolvedLocation?.latitude,
      triggerLongitude: resolvedLocation?.longitude,
      triggerAddress: address,
      currentLatitude: resolvedLocation?.latitude,
      currentLongitude: resolvedLocation?.longitude,
    },
  });

  if (resolvedLocation) {
    await prisma.userLocation.create({
      data: {
        userId,
        alertId: alert.id,
        latitude: resolvedLocation.latitude,
        longitude: resolvedLocation.longitude,
        accuracyMeters: resolvedLocation.accuracy,
      },
    });
  }

  logger.warn('SOS alert created', {
    alertId: alert.id,
    alertCode,
    userId,
    triggerMethod,
    latitude: resolvedLocation?.latitude,
    longitude: resolvedLocation?.longitude,
    accuracy: resolvedLocation?.accuracy,
    locationSource: resolvedLocation?.source ?? 'unavailable',
  });

  try {
    emitSOSCreated({
      alertId: alert.id,
      alertCode,
      userId,
      alertType: alert.alertType,
      triggerMethod: alert.triggerMethod,
      latitude: resolvedLocation?.latitude ?? 0,
      longitude: resolvedLocation?.longitude ?? 0,
      address,
      createdAt: alert.createdAt.toISOString(),
    });
    if (resolvedLocation) {
      void emitDepartmentScopedSosNotification(alert.id, resolvedLocation.latitude, resolvedLocation.longitude);
      void emitNgoScopedSosNotification(alert.id, resolvedLocation.latitude, resolvedLocation.longitude);
      void emitOfficerScopedSosNotification(alert.id, resolvedLocation.latitude, resolvedLocation.longitude);
    }
  } catch {
    logger.error('Socket emit failed for SOS_CREATED', { alertId: alert.id });
  }

  void notifyEmergencyContacts(userId, alert.id, resolvedLocation);

  return alert;
}

/**
 * Updates the status of an existing SOS alert and writes audit trail.
 */
export async function updateAlertStatus(input: UpdateSosStatusInput) {
  const { alertId, userId, userRole, newStatus, notes } = input;

  const alert = await prisma.sosAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new AppError('Alert not found', 404);

  const canUpdate =
    alert.userId === userId ||
    alert.assignedVolunteerId === userId ||
    alert.assignedPoliceId === userId ||
    userRole === 'admin' ||
    userRole === 'police' ||
    userRole === 'SUPERADMIN' ||
    userRole === 'POLICEMAN' ||
    userRole === 'VOLUNTEER' ||
    userRole === 'POLICE_DEPARTMENT' ||
    userRole === 'NGO';

  if (!canUpdate) throw new AppError('You are not authorized to update this alert', 403);

  await prisma.alertStatusHistory.create({
    data: {
      alertId,
      changedById: userId,
      changedByRole: userRole as never,
      oldStatus: alert.status,
      newStatus,
      notes,
    },
  });

  const updatedAlert = await prisma.sosAlert.update({
    where: { id: alertId },
    data: {
      status: newStatus,
      ...(newStatus === AlertStatus.resolved ? { resolvedAt: new Date(), resolutionNotes: notes } : {}),
      ...(newStatus === AlertStatus.escalated ? { escalatedAt: new Date(), escalationReason: notes } : {}),
    },
  });

  logger.info('Alert status updated', {
    alertId,
    oldStatus: alert.status,
    newStatus,
    updatedBy: userId,
  });

  try {
    emitAlertStatusChanged(alertId, {
      alertId,
      status: newStatus,
      updatedBy: userId,
      notes,
      timestamp: new Date().toISOString(),
    });
  } catch {
    logger.error('Socket emit failed for ALERT_STATUS_CHANGED', { alertId });
  }

  return updatedAlert;
}

export async function getActiveAlerts(userId: string, userRole: string) {
  if (userRole === 'user') {
    return prisma.sosAlert.findMany({
      where: {
        userId,
        status: { in: [AlertStatus.pending, AlertStatus.active, AlertStatus.accepted] },
      },
      orderBy: { createdAt: 'desc' },
      include: { statusHistory: { orderBy: { createdAt: 'desc' }, take: 3 } },
    });
  }

  return prisma.sosAlert.findMany({
    where: {
      status: { in: [AlertStatus.pending, AlertStatus.active, AlertStatus.accepted, AlertStatus.escalated] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, phone: true } },
      statusHistory: { orderBy: { createdAt: 'desc' }, take: 3 },
    },
    take: 50,
  });
}

export async function getAlertById(alertId: string, userId: string, userRole: string) {
  const alert = await prisma.sosAlert.findUnique({
    where: { id: alertId },
    include: {
      user: { select: { id: true, fullName: true, phone: true, email: true } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!alert) throw new AppError('Alert not found', 404);

  const canView =
    alert.userId === userId ||
    alert.assignedVolunteerId === userId ||
    userRole === 'police' ||
    userRole === 'admin' ||
    userRole === 'SUPERADMIN' ||
    userRole === 'POLICEMAN' ||
    userRole === 'VOLUNTEER' ||
    userRole === 'POLICE_DEPARTMENT' ||
    userRole === 'NGO';

  if (!canView) throw new AppError('Access denied', 403);

  return alert;
}

export async function getUserAlertHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [alerts, total] = await Promise.all([
    prisma.sosAlert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        alertCode: true,
        alertType: true,
        status: true,
        severity: true,
        triggerMethod: true,
        triggerAddress: true,
        triggerLatitude: true,
        triggerLongitude: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.sosAlert.count({ where: { userId } }),
  ]);

  return { alerts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function cancelAlert(alertId: string, userId: string): Promise<void> {
  const alert = await prisma.sosAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new AppError('Alert not found', 404);
  if (alert.userId !== userId) throw new AppError('Access denied', 403);

  const cancellableStatuses: AlertStatus[] = [
    AlertStatus.pending,
    AlertStatus.active,
    AlertStatus.accepted,
  ];
  if (!cancellableStatuses.includes(alert.status)) {
    throw new AppError(`Cannot cancel alert in status: ${alert.status}`, 400);
  }

  await prisma.$transaction([
    prisma.alertStatusHistory.create({
      data: {
        alertId,
        changedById: userId,
        changedByRole: 'user',
        oldStatus: alert.status,
        newStatus: AlertStatus.cancelled,
        notes: 'Cancelled by user',
      },
    }),
    prisma.sosAlert.update({
      where: { id: alertId },
      data: { status: AlertStatus.cancelled },
    }),
  ]);

  logger.info('Alert cancelled by user', { alertId, userId });
}

async function notifyEmergencyContacts(
  userId: string,
  alertId: string,
  location: ResolvedSosLocation | null
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        emergencyContacts: {
          where: { notifyOnSos: true },
          orderBy: { priorityOrder: 'asc' },
        },
      },
    });

    if (!user) return;

    await sendSOSAlert(
      {
        fullName: user.fullName,
        phone: user.phone ?? 'Unavailable',
        email: user.email,
        triggeredAt: new Date(),
        alertId,
      },
      user.emergencyContacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      })),
      location
    );
  } catch (error) {
    logger.error('Failed to notify emergency contacts', { alertId, error });
  }
}

async function resolveSosLocation(
  userId: string,
  location?: CreateSosInput['location']
): Promise<ResolvedSosLocation | null> {
  if (location) {
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      source: 'live',
    };
  }

  const lastKnownLocation = await prisma.userLocation.findFirst({
    where: { userId },
    orderBy: { recordedAt: 'desc' },
  });

  if (!lastKnownLocation) {
    return null;
  }

  return {
    latitude: lastKnownLocation.latitude,
    longitude: lastKnownLocation.longitude,
    accuracy:
      lastKnownLocation.accuracyMeters !== null && lastKnownLocation.accuracyMeters !== undefined
        ? Number(lastKnownLocation.accuracyMeters)
        : undefined,
    source: 'last_known',
  };
}
