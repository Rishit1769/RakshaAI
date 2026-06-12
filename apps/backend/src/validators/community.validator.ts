import { z } from 'zod';

const REPORT_CATEGORIES = [
  'unsafe_area',
  'stalking',
  'broken_streetlight',
  'suspicious_behavior',
  'unsafe_transport',
  'harassment',
  'poor_lighting',
  'other',
] as const;

export const createReportSchema = z.object({
  isAnonymous: z.boolean().optional(),
  category: z.enum(REPORT_CATEGORIES),
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).max(2000).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
});

export const upvoteSchema = z.object({
  reportId: z.string().uuid(),
});

export const commentSchema = z.object({
  reportId: z.string().uuid(),
  content: z.string().trim().min(1).max(500),
});

export const incidentCommentSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

export const getReportsQuerySchema = z.object({
  category: z.enum(REPORT_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateReportBody = z.infer<typeof createReportSchema>;
export type GetReportsQuery = z.infer<typeof getReportsQuerySchema>;
