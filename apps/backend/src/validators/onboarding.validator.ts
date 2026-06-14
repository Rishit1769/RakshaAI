import { z } from 'zod';

export const adminOnboardSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(6).max(72),
  role: z.enum(['admin', 'department', 'worker', 'user']),
  departmentId: z.string().uuid().optional(),
});

export const departmentOnboardWorkerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(6).max(72),
});

export const userStatusParamSchema = z.object({
  id: z.string().uuid(),
});

export const userStatusBodySchema = z.object({
  isActive: z.boolean(),
});

export type AdminOnboardInput = z.infer<typeof adminOnboardSchema>;
export type DepartmentOnboardWorkerInput = z.infer<typeof departmentOnboardWorkerSchema>;
