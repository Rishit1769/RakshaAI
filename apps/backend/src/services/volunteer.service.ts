import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';
import { emitVolunteerAccepted } from '../sockets';

export interface RegisterVolunteerInput {
  userId: string;
  skills?: string[];
  languagesSpoken?: string[];
  serviceRadiusKm?: number;
  ngoAffiliation?: string;
}

export interface UpdateAvailabilityInput {
  userId: string;
  status: 'available' | 'busy' | 'offline';
}

export async function registerVolunteer(input: RegisterVolunteerInput) {
  const { userId, skills = [], languagesSpoken = [], serviceRadiusKm = 5, ngoAffiliation } = input;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  const existing = await prisma.volunteer.findUnique({ where: { userId } });
  if (existing) throw new AppError('Volunteer profile already exists', 409);

  const volunteer = await prisma.volunteer.create({
    data: {
      userId,
      skills,
      languagesSpoken,
      serviceRadiusKm,
      ngoAffiliation,
      status: 'offline',
    },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
  });

  // Update user role to volunteer
  await prisma.user.update({ where: { id: userId }, data: { role: 'volunteer' } });

  return volunteer;
}

export async function getVolunteerProfile(userId: string) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, profilePhoto: true } },
      availability: true,
    },
  });

  if (!volunteer) throw new AppError('Volunteer profile not found', 404);
  return volunteer;
}

export async function updateAvailability(input: UpdateAvailabilityInput) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId: input.userId } });
  if (!volunteer) throw new AppError('Volunteer profile not found', 404);

  const updated = await prisma.volunteer.update({
    where: { userId: input.userId },
    data: {
      status: input.status,
      lastActiveAt: input.status === 'available' ? new Date() : undefined,
    },
  });

  return updated;
}

export async function acceptAlert(volunteerId: string, alertId: string) {
  const volunteer = await prisma.volunteer.findUnique({
    where: { userId: volunteerId },
    include: { user: { select: { id: true, fullName: true, phone: true } } },
  });

  if (!volunteer) throw new AppError('Volunteer profile not found', 404);
  if (volunteer.status !== 'available') throw new AppError('Volunteer is not available', 400);
  if (volunteer.verificationStatus !== 'verified') throw new AppError('Volunteer not verified', 403);

  const alert = await prisma.sosAlert.findUnique({ where: { id: alertId } });
  if (!alert) throw new AppError('Alert not found', 404);
  if (!['pending', 'active'].includes(alert.status)) throw new AppError('Alert is not open for acceptance', 400);
  if (alert.assignedVolunteerId) throw new AppError('Alert already has a volunteer assigned', 409);

  const [updatedAlert] = await prisma.$transaction([
    prisma.sosAlert.update({
      where: { id: alertId },
      data: {
        assignedVolunteerId: volunteer.id,
        status: 'accepted',
      },
    }),
    prisma.volunteer.update({
      where: { id: volunteer.id },
      data: { status: 'busy', totalResponses: { increment: 1 } },
    }),
  ]);

  // Real-time notification to the victim
  emitVolunteerAccepted(alertId, {
    alertId,
    volunteerName: volunteer.user.fullName ?? 'Volunteer',
    volunteerPhone: volunteer.user.phone ?? '',
    eta: null,
    status: 'accepted',
  });

  return updatedAlert;
}

export async function getActiveAlertsFeed(volunteerId: string) {
  const volunteer = await prisma.volunteer.findUnique({ where: { userId: volunteerId } });
  if (!volunteer) throw new AppError('Volunteer profile not found', 404);

  const alerts = await prisma.sosAlert.findMany({
    where: {
      status: { in: ['pending', 'active'] },
      assignedVolunteerId: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      alertCode: true,
      alertType: true,
      severity: true,
      triggerLatitude: true,
      triggerLongitude: true,
      triggerAddress: true,
      description: true,
      createdAt: true,
    },
  });

  return alerts;
}
