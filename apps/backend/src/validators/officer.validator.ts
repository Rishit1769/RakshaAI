import { z } from 'zod';

export const officerEntityParamSchema = z.object({
  id: z.string().uuid(),
});

export const officerIncidentsQuerySchema = z.object({
  radius: z.coerce.number().min(1).max(20).default(5),
});

export const officerReportSchema = z.object({
  type: z.enum(['unsafe_area', 'stalking', 'broken_streetlight', 'suspicious_behavior', 'unsafe_transport', 'harassment', 'poor_lighting', 'other']),
  description: z.string().trim().min(10).max(1000),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  evidenceUrl: z.string().trim().url().max(400).optional(),
});
