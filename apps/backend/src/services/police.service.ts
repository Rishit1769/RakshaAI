import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { emitPoliceAccepted, emitAlertStatusChanged } from '../sockets';

export interface CreatePoliceAccountInput {
  userId: string;
  badgeNumber: string;
  rank?: string;
  stationId: string;
}

export async function createPoliceAccount(input: CreatePoliceAccountInput) {
  const { userId, badgeNumber, rank, stationId } = input;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const station = await prisma.policeStation.findUnique({ where: { id: stationId } });
  if (!station) throw new AppError('Police station not found', 404);

  const existing = await prisma.policeAccount.findUnique({ where: { userId } });
  if (existing) throw new AppError('Police account already exists', 409);

  const badgeExists = await prisma.policeAccount.findUnique({ where: { badgeNumber } });
  if (badgeExists) throw new AppError('Badge number already registered', 409);

  const account = await prisma.policeAccount.create({
    data: { userId, badgeNumber, rank, stationId, verificationStatus: 'pending' },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      station: { select: { id: true, name: true, city: true } },
    },
  });

  await prisma.user.update({ where: { id: userId }, data: { role: 'police' } });

  return account;
}

export async function getPoliceProfile(userId: string) {
  const account = await prisma.policeAccount.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, profilePhoto: true } },
      station: true,
    },
  });

  if (!account) throw new AppError('Police account not found', 404);
  return account;
}

export async function assignAlert(policeUserId: string, alertId: string) {
  const account = await prisma.policeAccount.findUnique({ where: { userId: policeUserId } });
  if (!account) throw new AppError('Police account not found', 404);
  if (account.verificationStatus !== 'verified') throw new AppError('Police account not verified', 403);

  const alert = await prisma.sosAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new AppError('Alert not found', 404);
  if (!['pending', 'active', 'accepted'].includes(alert.status)) {
    throw new AppError('Alert is not in an assignable state', 400);
  }

  const updatedAlert = await prisma.sosAlert.update({
    where: { id: alertId },
    data: {
      assignedPoliceId: account.id,
      assignedStationId: account.stationId,
      status: 'accepted',
    },
  });

  const policeUser = await prisma.user.findUnique({ where: { id: policeUserId }, select: { fullName: true, phone: true } });

  emitPoliceAccepted(alertId, {
    alertId,
    officerName: policeUser?.fullName ?? 'Officer',
    officerPhone: policeUser?.phone ?? '',
    badgeNumber: account.badgeNumber,
    status: 'accepted',
  });

  return updatedAlert;
}

export async function escalateAlert(policeUserId: string, alertId: string, reason: string) {
  const account = await prisma.policeAccount.findUnique({ where: { userId: policeUserId } });
  if (!account) throw new AppError('Police account not found', 404);

  const alert = await prisma.sosAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new AppError('Alert not found', 404);

  const updatedAlert = await prisma.sosAlert.update({
    where: { id: alertId },
    data: {
      status: 'escalated',
      escalatedAt: new Date(),
      escalationReason: reason,
    },
  });

  emitAlertStatusChanged(alertId, { alertId, status: 'escalated', updatedAt: new Date().toISOString() });

  return updatedAlert;
}

export async function setDutyStatus(userId: string, isOnDuty: boolean) {
  const account = await prisma.policeAccount.findUnique({ where: { userId } });
  if (!account) throw new AppError('Police account not found', 404);

  return prisma.policeAccount.update({ where: { userId }, data: { isOnDuty } });
}

export async function getAlertsFeed(policeUserId: string) {
  const account = await prisma.policeAccount.findUnique({ where: { userId: policeUserId } });
  if (!account) throw new AppError('Police account not found', 404);

  return prisma.sosAlert.findMany({
    where: { status: { in: ['pending', 'active', 'accepted', 'escalated'] } },
    orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
    take: 30,
    select: {
      id: true,
      alertCode: true,
      alertType: true,
      severity: true,
      status: true,
      triggerLatitude: true,
      triggerLongitude: true,
      triggerAddress: true,
      description: true,
      escalationReason: true,
      createdAt: true,
    },
  });
}
