import { AlertType, AlertStatus, SosTriggerMethod, IncidentSeverity } from '@prisma/client';
import { prisma } from '../config/database';
import { generateAlertCode } from '../utils/helpers';
import { sendEmergencyEmail } from './email.service';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger';
import { emitSOSCreated, emitAlertStatusChanged } from '../sockets';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CreateSosInput {
  userId: string;
  triggerMethod: SosTriggerMethod;
  alertType?: AlertType;
  latitude: number;
  longitude: number;
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

// ─── SOS Service ────────────────────────────────────────────────────────────

/**
 * Creates a new SOS alert. This is the highest-priority operation in the system.
 * Must succeed fast — AI classification and notification happen asynchronously.
 */
export async function createSosAlert(input: CreateSosInput) {
  const { userId, triggerMethod, alertType, latitude, longitude, description, address } = input;

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
      triggerLatitude: latitude,
      triggerLongitude: longitude,
      triggerAddress: address,
    },
  });

  logger.warn('🚨 SOS Alert created', {
    alertId: alert.id,
    alertCode,
    userId,
    triggerMethod,
    latitude,
    longitude,
  });

  // Broadcast to all connected responders in real-time
  try {
    emitSOSCreated({
      alertId: alert.id,
      alertCode,
      userId,
      alertType: alert.alertType,
      triggerMethod: alert.triggerMethod,
      latitude,
      longitude,
      address,
      createdAt: alert.createdAt.toISOString(),
    });
  } catch {
    // Socket failure must NOT block alert creation
    logger.error('Socket emit failed for SOS_CREATED', { alertId: alert.id });
  }

  // Fire-and-forget: notify emergency contacts (non-blocking)
  void notifyEmergencyContacts(userId, alert.id, alertCode, latitude, longitude, description);

  return alert;
}

/**
 * Updates the status of an existing SOS alert and writes audit trail.
 */
export async function updateAlertStatus(input: UpdateSosStatusInput) {
  const { alertId, userId, userRole, newStatus, notes, latitude, longitude } = input;

  const alert = await prisma.sosAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new AppError('Alert not found', 404);

  // Only the alert owner, assigned responders, police, admin can update
  const canUpdate =
    alert.userId === userId ||
    alert.assignedVolunteerId === userId ||
    alert.assignedPoliceId === userId ||
    userRole === 'admin' ||
    userRole === 'police';

  if (!canUpdate) throw new AppError('You are not authorized to update this alert', 403);

  // Write status history before updating
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

  // Broadcast status change to all alert room subscribers
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

/**
 * Fetches active alerts — filtered by role:
 * - user: their own active alerts
 * - volunteer/police/admin: all active alerts in system
 */
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

  // Responders and admins see all non-resolved active alerts
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

/**
 * Gets a single alert by ID. Only accessible by owner or responders.
 */
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
    userRole === 'admin';

  if (!canView) throw new AppError('Access denied', 403);

  return alert;
}

/**
 * Gets alert history for the authenticated user.
 */
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
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.sosAlert.count({ where: { userId } }),
  ]);

  return { alerts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

/**
 * Cancels an active SOS alert (user-initiated).
 */
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

// ─── Internal: Notify Emergency Contacts ─────────────────────────────────────

async function notifyEmergencyContacts(
  userId: string,
  alertId: string,
  alertCode: string,
  latitude: number,
  longitude: number,
  message?: string
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

    type EmergencyContactTarget = { name: string; email: string | null };
    const contacts = user.emergencyContacts as EmergencyContactTarget[];

    const emailPromises = contacts
      .filter((c: EmergencyContactTarget) => c.email)
      .map((contact) =>
        sendEmergencyEmail({
          to: contact.email!,
          contactName: contact.name,
          userName: user.fullName,
          alertCode,
          latitude,
          longitude,
          message,
        })
      );

    await Promise.allSettled(emailPromises);
    logger.info('Emergency contacts notified', {
      alertId,
      count: emailPromises.length,
    });
  } catch (error) {
    // Notification failure MUST NOT affect SOS creation
    logger.error('Failed to notify emergency contacts', { alertId, error });
  }
}
