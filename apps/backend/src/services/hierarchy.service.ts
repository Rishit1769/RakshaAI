import { OrganizationStatus, OrganizationType, UserRole, VerificationStatus, VolunteerStatus, WorkerType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { hashPassword } from '../utils/password';
import { createAuditLog } from '../utils/createAuditLog';
import { sendWelcomeEmail } from './emailService';

interface ManagedAccountInput {
  name: string;
  email: string;
  tempPassword: string;
}

interface CreatePolicemanInput extends ManagedAccountInput {
  badgeNumber: string;
}

interface ManagedUserSummary {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  workerProfile?: { id: string } | null;
}

export async function createDepartment(actorId: string, input: ManagedAccountInput) {
  return createManagedUser({
    actorId,
    action: 'CREATED_POLICE_DEPARTMENT',
    role: UserRole.POLICE_DEPARTMENT,
    ...input,
  });
}

export async function createNgo(actorId: string, input: ManagedAccountInput) {
  return createManagedUser({
    actorId,
    action: 'CREATED_NGO',
    role: UserRole.NGO,
    ...input,
  });
}

export async function listDepartments() {
  return listManagedUsers(UserRole.POLICE_DEPARTMENT);
}

export async function listNgos() {
  return listManagedUsers(UserRole.NGO);
}

export async function getDepartmentById(id: string) {
  return getManagedGroupById(id, UserRole.POLICE_DEPARTMENT);
}

export async function getNgoById(id: string) {
  return getManagedGroupById(id, UserRole.NGO);
}

export async function createPoliceman(actorId: string, input: CreatePolicemanInput) {
  return createManagedUser({
    actorId,
    name: input.name,
    email: input.email,
    tempPassword: input.tempPassword,
    action: 'CREATED_POLICEMAN',
    role: UserRole.POLICEMAN,
    departmentId: actorId,
    badgeNumber: input.badgeNumber,
  });
}

export async function listDepartmentPolicemen(departmentId: string) {
  return prisma.user.findMany({
    where: {
      role: UserRole.POLICEMAN,
      departmentId,
    },
    select: managedUserSelectWithWorker,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createVolunteer(actorId: string, input: ManagedAccountInput) {
  return createManagedUser({
    actorId,
    action: 'CREATED_VOLUNTEER',
    role: UserRole.VOLUNTEER,
    ngoId: actorId,
    ...input,
  });
}

export async function listNgoVolunteers(ngoId: string) {
  return prisma.user.findMany({
    where: {
      role: UserRole.VOLUNTEER,
      ngoId,
    },
    select: managedUserSelect,
    orderBy: { createdAt: 'desc' },
  });
}

async function createManagedUser(input: {
  actorId: string;
  name: string;
  email: string;
  tempPassword: string;
  role: UserRole;
  action: string;
  departmentId?: string;
  ngoId?: string;
  badgeNumber?: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await hashPassword(input.tempPassword);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        fullName: input.name.trim(),
        email,
        passwordHash,
        role: input.role,
        departmentId: input.departmentId,
        ngoId: input.ngoId,
        createdById: input.actorId,
        isActive: true,
        isVerified: true,
        isEmailVerified: true,
        mustChangePassword: true,
      },
      select: managedUserSelectWithWorker,
    });

    if (input.role === UserRole.POLICE_DEPARTMENT || input.role === UserRole.NGO) {
      await ensureOrganizationForManagedOwner(tx, createdUser.id, createdUser.fullName, email, input.role);
    }

    if (input.role === UserRole.POLICEMAN) {
      await ensureWorkerProfileForPoliceman(tx, createdUser.id, createdUser.fullName, email, passwordHash, input.actorId, input.badgeNumber);
    }

    if (input.role === UserRole.VOLUNTEER) {
      await ensureVolunteerProfile(tx, createdUser.id, input.actorId);
    }

    await createAuditLog(
      input.actorId,
      input.action,
      createdUser.id,
      {
        email: createdUser.email,
        role: createdUser.role,
        departmentId: input.departmentId ?? null,
        ngoId: input.ngoId ?? null,
        badgeNumber: input.badgeNumber ?? null,
      },
      'User',
      tx
    );

    return createdUser;
  });

  void sendWelcomeEmail({
    fullName: user.fullName,
    email: user.email,
    password: input.tempPassword,
    role: user.role,
    departmentName: await resolveDepartmentNameForWelcome(user),
  });

  return user;
}

async function listManagedUsers(role: UserRole) {
  return prisma.user.findMany({
    where: { role },
    select: managedUserSelectWithWorker,
    orderBy: { createdAt: 'desc' },
  });
}

async function getManagedGroupById(id: string, role: UserRole) {
  const user = await prisma.user.findFirst({
    where: { id, role },
    select: {
      ...managedUserSelectWithWorker,
      policemen: {
        where: { role: UserRole.POLICEMAN },
        select: managedUserSelectWithWorker,
        orderBy: { createdAt: 'desc' },
      },
      ngoVolunteers: {
        where: { role: UserRole.VOLUNTEER },
        select: managedUserSelectWithWorker,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!user) {
    throw new AppError(`${role === UserRole.POLICE_DEPARTMENT ? 'Police department' : 'NGO'} not found`, 404);
  }

  return user;
}

const managedUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  isActive: true,
  mustChangePassword: true,
  createdAt: true,
} satisfies Record<keyof Pick<ManagedUserSummary, 'id' | 'fullName' | 'email' | 'role' | 'isActive' | 'mustChangePassword' | 'createdAt'>, true>;

const managedUserSelectWithWorker = {
  ...managedUserSelect,
  workerProfile: {
    select: {
      id: true,
    },
  },
};

async function ensureOrganizationForManagedOwner(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  ownerUserId: string,
  fullName: string,
  email: string,
  role: 'POLICE_DEPARTMENT' | 'NGO'
) {
  const organizationType = role === UserRole.POLICE_DEPARTMENT ? OrganizationType.police : OrganizationType.ngo;
  const existing = await tx.organization.findFirst({
    where: {
      createdById: ownerUserId,
      organizationType,
    },
    select: { id: true },
  });

  if (existing) return;

  await tx.organization.create({
    data: {
      organizationName: fullName,
      organizationType,
      email,
      status: OrganizationStatus.approved,
      createdById: ownerUserId,
      approvedAt: new Date(),
    },
  });
}

async function ensureWorkerProfileForPoliceman(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  userId: string,
  fullName: string,
  email: string,
  passwordHash: string,
  departmentOwnerId: string,
  badgeNumber?: string
) {
  const organization = await tx.organization.findFirst({
    where: {
      createdById: departmentOwnerId,
      organizationType: OrganizationType.police,
    },
    select: { id: true },
  });

  if (!organization) {
    throw new AppError('Police department organization not found', 404);
  }

  const existing = await tx.worker.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) return;

  await tx.worker.create({
    data: {
      userId,
      organizationId: organization.id,
      workerType: WorkerType.police_officer,
      customRole: badgeNumber ?? 'policeman',
      email,
      passwordHash,
      fullName,
      isActive: true,
    },
  });
}

async function ensureVolunteerProfile(
  tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  userId: string,
  ngoOwnerId: string
) {
  const existing = await tx.volunteer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) return;

  const ngo = await tx.user.findUnique({
    where: { id: ngoOwnerId },
    select: { fullName: true },
  });

  await tx.volunteer.create({
    data: {
      userId,
      status: VolunteerStatus.offline,
      verificationStatus: VerificationStatus.verified,
      ngoAffiliation: ngo?.fullName ?? 'NGO',
      skills: [],
      languagesSpoken: [],
      serviceRadiusKm: 5,
      aadhaarVerified: true,
    },
  });
}

async function resolveDepartmentNameForWelcome(user: ManagedUserSummary) {
  if (user.role === UserRole.POLICEMAN && user.workerProfile?.id) {
    const worker = await prisma.worker.findUnique({
      where: { id: user.workerProfile.id },
      select: {
        organization: {
          select: { organizationName: true },
        },
      },
    });

    return worker?.organization.organizationName ?? null;
  }

  if (user.role === UserRole.VOLUNTEER && user.id) {
    const volunteer = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        ngo: {
          select: { fullName: true },
        },
      },
    });

    return volunteer?.ngo?.fullName ?? null;
  }

  return null;
}
