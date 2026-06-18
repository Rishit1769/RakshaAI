import { z } from 'zod';

const managedAccountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  tempPassword: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const createDepartmentSchema = managedAccountSchema;
export const createNgoSchema = managedAccountSchema;
export const createVolunteerSchema = managedAccountSchema;

export const createPolicemanSchema = managedAccountSchema.extend({
  badgeNumber: z.string().trim().min(2).max(30),
});

export const managedUserParamSchema = z.object({
  id: z.string().uuid(),
});
