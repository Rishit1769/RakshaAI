import { z } from 'zod';

export const userStatusParamSchema = z.object({
  id: z.string().uuid(),
});

export const userStatusBodySchema = z.object({
  isActive: z.boolean(),
});

export const officialReportSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5),
  category: z.string().trim().min(2),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
});

export const volunteerCheckInSchema = z.object({
  caseId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  notes: z.string().trim().max(500).optional(),
});
