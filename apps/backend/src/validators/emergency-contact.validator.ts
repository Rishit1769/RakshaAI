import { z } from 'zod';

const phoneRegex = /^\+?[1-9]\d{9,14}$/;

const baseSchema = {
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  relationship: z.string({ required_error: 'Relationship is required' }).trim().min(1, 'Relationship is required').max(50, 'Relationship must not exceed 50 characters'),
  phone: z.string({ required_error: 'Phone number is required' }).trim().regex(phoneRegex, 'Please provide a valid phone number'),
  email: z.union([z.string().trim().email('Please provide a valid email address').max(150), z.literal('')]).optional().transform((value) => value || undefined),
  isPrimary: z.boolean().optional().default(false),
};

export const createEmergencyContactSchema = z.object(baseSchema);

export const updateEmergencyContactSchema = z.object({
  ...baseSchema,
});

export const emergencyContactIdSchema = z.object({
  id: z.string().min(1, 'Contact ID is required'),
});

export type CreateEmergencyContactInput = z.infer<typeof createEmergencyContactSchema>;
export type UpdateEmergencyContactInput = z.infer<typeof updateEmergencyContactSchema>;
