import { z } from 'zod';

export const triggerRedZoneSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string().trim().min(3).max(1000),
});

export type TriggerRedZoneInput = z.infer<typeof triggerRedZoneSchema>;
