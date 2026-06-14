import { z } from 'zod';

const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);
const accuracySchema = z.number().nonnegative().max(100000);

const locationSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  accuracy: accuracySchema.optional(),
});

export const createSosSchema = z.object({
  triggerMethod: z.enum(
    ['tap', 'long_press', 'voice', 'shake', 'silent', 'hidden_trigger', 'auto_journey'],
    { required_error: 'Trigger method is required' }
  ),

  alertType: z
    .enum([
      'harassment', 'assault', 'medical_emergency', 'kidnapping_risk',
      'cyberstalking', 'suspicious_activity', 'general_danger', 'stalking', 'theft',
    ])
    .optional(),

  location: locationSchema.optional(),

  description: z.string().trim().max(1000, 'Description too long').optional(),
  address: z.string().trim().max(300, 'Address too long').optional(),
});

export const updateSosStatusSchema = z.object({
  alertId: z
    .string({ required_error: 'Alert ID is required' })
    .uuid('Invalid alert ID format'),

  newStatus: z.enum(
    ['pending', 'active', 'accepted', 'resolved', 'false_alarm', 'escalated', 'cancelled'],
    { required_error: 'New status is required' }
  ),

  notes: z.string().trim().max(500, 'Notes too long').optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
});

export const alertIdParamSchema = z.object({
  id: z.string().uuid('Invalid alert ID format'),
});

export const alertHistoryQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((v) => parseInt(v, 10)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((v) => parseInt(v, 10)),
});

export type CreateSosInput = z.infer<typeof createSosSchema>;
export type UpdateSosStatusInput = z.infer<typeof updateSosStatusSchema>;
export type AlertHistoryQuery = z.infer<typeof alertHistoryQuerySchema>;
