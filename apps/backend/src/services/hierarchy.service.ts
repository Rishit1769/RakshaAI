import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { hashPassword } from '../utils/password';

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
    select: managedUserSelect,
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

  const user = await prisma.user.create({
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
    select: managedUserSelect,
  });

  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      actorRole: null,
      action: input.action,
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        departmentId: input.departmentId ?? null,
        ngoId: input.ngoId ?? null,
        badgeNumber: input.badgeNumber ?? null,
      },
    },
  });

  return user;
}

async function listManagedUsers(role: UserRole) {
  return prisma.user.findMany({
    where: { role },
    select: managedUserSelect,
    orderBy: { createdAt: 'desc' },
  });
}

async function getManagedGroupById(id: string, role: UserRole) {
  const user = await prisma.user.findFirst({
    where: { id, role },
    select: {
      ...managedUserSelect,
      policemen: {
        where: { role: UserRole.POLICEMAN },
        select: managedUserSelect,
        orderBy: { createdAt: 'desc' },
      },
      ngoVolunteers: {
        where: { role: UserRole.VOLUNTEER },
        select: managedUserSelect,
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
