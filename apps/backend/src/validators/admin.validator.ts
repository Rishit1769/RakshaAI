import { UserRole } from '@prisma/client';
import { z } from 'zod';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const userListQuerySchema = paginationSchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  search: z.string().trim().max(150).optional(),
});

export const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(100).optional(),
});

export const emailCheckQuerySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(150),
});

export const managedEntityParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateUserRoleBodySchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const toggleSuspensionBodySchema = z.object({
  isSuspended: z.boolean(),
});

export const moderationDismissBodySchema = z.object({
  type: z.enum(['incident', 'comment']),
});

export const hotspotStatusBodySchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
