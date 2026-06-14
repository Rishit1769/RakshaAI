import { OrganizationType, OrganizationStatus, UserRole, WorkerType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { hashPassword } from '../utils/password';
import { sendWelcomeEmail } from './emailService';

export interface AdminOnboardInput {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'department' | 'worker' | 'user';
  departmentId?: string;
}

export interface DepartmentOnboardWorkerInput {
  name: string;
  email: string;
  password: string;
}

export async function adminOnboardUser(actorId: string, input: AdminOnboardInput) {
  const role = input.role as UserRole;
  const department = await resolveDepartmentForRole(input.departmentId, role);
  const user = await createRoleUser({
    actorId,
    fullName: input.name,
    email: input.email,
    password: input.password,
    role,
    departmentId: department?.id,
    departmentType: department?.organizationType,
  });

  return user;
}

export async function departmentOnboardWorker(actorId: string, departmentId: string, input: DepartmentOnboardWorkerInput) {
  const department = await prisma.organization.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  if (department.status !== OrganizationStatus.approved) {
    throw new AppError('Department must be approved before onboarding workers', 400);
  }

  return createRoleUser({
    actorId,
    fullName: input.name,
    email: input.email,
    password: input.password,
    role: UserRole.worker,
    departmentId: department.id,
    departmentType: department.organizationType,
  });
}

export async function setUserActiveStatus(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found', 404);

  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      departmentId: true,
    },
  });
}

async function createRoleUser(input: {
  actorId: string;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  departmentId?: string;
  departmentType?: OrganizationType;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError('Email is already registered', 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: input.role,
      departmentId: input.departmentId,
      isVerified: true,
      isEmailVerified: true,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      departmentId: true,
    },
  });

  if (input.role === UserRole.worker && input.departmentId && input.departmentType) {
    await prisma.worker.create({
      data: {
        userId: user.id,
        organizationId: input.departmentId,
        workerType: mapOrganizationTypeToWorkerType(input.departmentType),
        customRole: `${input.departmentType}_worker`,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
      },
    });
  }

  const departmentName = input.departmentId
    ? (await prisma.organization.findUnique({
        where: { id: input.departmentId },
        select: { organizationName: true },
      }))?.organizationName ?? null
    : null;

  void sendWelcomeEmail({
    fullName: input.fullName,
    email: input.email,
    password: input.password,
    role: input.role,
    departmentName,
  });

  return user;
}

async function resolveDepartmentForRole(departmentId: string | undefined, role: UserRole) {
  if (role !== UserRole.department && role !== UserRole.worker) {
    return null;
  }

  if (!departmentId) {
    throw new AppError('departmentId is required for department and worker accounts', 400);
  }

  const department = await prisma.organization.findUnique({
    where: { id: departmentId },
  });

  if (!department) {
    throw new AppError('Department not found', 404);
  }

  return department;
}

function mapOrganizationTypeToWorkerType(type: OrganizationType): WorkerType {
  if (type === OrganizationType.police) return WorkerType.police_officer;
  if (type === OrganizationType.ngo) return WorkerType.ngo_worker;
  if (type === OrganizationType.government) return WorkerType.coordinator;
  return WorkerType.custom;
}
