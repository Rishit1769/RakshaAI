/**
 * Organization Service — RBAC
 * Only super_admin can create/manage organizations.
 * Only organization_admin can create/manage workers.
 */

import { OrganizationStatus, OrganizationType, WorkerType } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger';
import { hashPassword } from '../utils/password';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateOrganizationInput {
  organizationName: string;
  organizationType: OrganizationType;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CreateWorkerInput {
  organizationId: string;
  workerType: WorkerType;
  customRole?: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

// ─── Organization CRUD ──────────────────────────────────────────────────────

export async function createOrganization(
  createdById: string,
  input: CreateOrganizationInput
) {
  if (input.email) {
    const existing = await prisma.organization.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError('An organization with this email already exists', 409);
  }

  const org = await prisma.organization.create({
    data: { ...input, createdById, status: OrganizationStatus.pending },
  });

  await prisma.auditLog.create({
    data: {
      actorId: createdById,
      actorRole: 'super_admin',
      action: 'organization.create',
      entityType: 'Organization',
      entityId: org.id,
      metadata: { name: org.organizationName, type: org.organizationType },
    },
  });

  logger.info('Organization created', { orgId: org.id, name: org.organizationName });
  return org;
}

export async function approveOrganization(orgId: string, actorId: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError('Organization not found', 404);

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { status: OrganizationStatus.approved, approvedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole: 'super_admin',
      action: 'organization.approve',
      entityType: 'Organization',
      entityId: orgId,
    },
  });

  return updated;
}

export async function suspendOrganization(orgId: string, actorId: string, reason?: string) {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError('Organization not found', 404);

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      status: OrganizationStatus.suspended,
      suspendedAt: new Date(),
      suspendReason: reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole: 'super_admin',
      action: 'organization.suspend',
      entityType: 'Organization',
      entityId: orgId,
      metadata: { reason },
    },
  });

  return updated;
}

export async function listOrganizations(filters?: {
  status?: OrganizationStatus;
  type?: OrganizationType;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { organizationType: filters.type } : {}),
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        _count: { select: { workers: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.organization.count({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { organizationType: filters.type } : {}),
      },
    }),
  ]);

  return { data: orgs, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getOrganizationById(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
      workers: {
        select: {
          id: true,
          fullName: true,
          email: true,
          workerType: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });
  if (!org) throw new AppError('Organization not found', 404);
  return org;
}

// ─── Worker CRUD ─────────────────────────────────────────────────────────────

export async function createWorker(actorId: string, input: CreateWorkerInput) {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
  if (!org) throw new AppError('Organization not found', 404);
  if (org.status !== OrganizationStatus.approved) {
    throw new AppError('Organization must be approved before adding workers', 400);
  }

  const existing = await prisma.worker.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError('A worker with this email already exists', 409);

  const passwordHash = await hashPassword(input.password);

  const worker = await prisma.worker.create({
    data: {
      organizationId: input.organizationId,
      workerType: input.workerType,
      customRole: input.customRole,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole: 'organization_admin',
      action: 'worker.create',
      entityType: 'Worker',
      entityId: worker.id,
      metadata: { email: worker.email, orgId: input.organizationId },
    },
  });

  logger.info('Worker created', { workerId: worker.id, orgId: input.organizationId });
  return { ...worker, passwordHash: undefined };
}

export async function listWorkers(organizationId: string) {
  const workers = await prisma.worker.findMany({
    where: { organizationId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      workerType: true,
      customRole: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return workers;
}

export async function deactivateWorker(workerId: string, actorId: string) {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) throw new AppError('Worker not found', 404);

  const updated = await prisma.worker.update({
    where: { id: workerId },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole: 'organization_admin',
      action: 'worker.deactivate',
      entityType: 'Worker',
      entityId: workerId,
    },
  });

  return updated;
}
