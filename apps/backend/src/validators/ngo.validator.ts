import { z } from 'zod';
import { createVolunteerSchema } from './hierarchy.validator';

export const ngoEntityParamSchema = z.object({
  id: z.string().uuid(),
});

export const ngoSosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const createNgoVolunteerSchema = createVolunteerSchema;

export const ngoIncidentAssignSchema = z.object({
  volunteerId: z.string().uuid(),
});

export const ngoSosRespondSchema = z.object({
  volunteerId: z.string().uuid(),
});
