import { z } from 'zod';

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

export const createZoneSchema = z.object({
  name: z.string().trim().min(2).max(200),
  departmentId: z.string().uuid().optional(),
  center: z.object({
    latitude: latSchema,
    longitude: lngSchema,
  }),
  radius: z.number().positive().max(100000),
});

export const updateZoneSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  center: z.object({
    latitude: latSchema,
    longitude: lngSchema,
  }).optional(),
  radius: z.number().positive().max(100000).optional(),
});

export const zoneIdParamSchema = z.object({
  id: z.string().uuid(),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
