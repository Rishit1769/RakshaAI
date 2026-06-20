import { z } from 'zod';

export const volunteerEntityParamSchema = z.object({
  id: z.string().uuid(),
});

export const volunteerCheckInSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  note: z.string().trim().max(300).optional(),
});

export const volunteerIncidentMapQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7),
});
