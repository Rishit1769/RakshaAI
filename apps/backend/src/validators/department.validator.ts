import { z } from 'zod';
import { createPolicemanSchema } from './hierarchy.validator';

export const departmentEntityParamSchema = z.object({
  id: z.string().uuid(),
});

export const departmentSosQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const createDepartmentHotspotSchema = z.object({
  name: z.string().trim().min(2).max(200),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(10000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

export const updateDepartmentHotspotSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(100).max(10000).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const assignDepartmentHotspotSchema = z.object({
  policemanId: z.string().uuid(),
});

export const createDepartmentZoneSchema = z.object({
  name: z.string().trim().min(2).max(200),
  type: z.enum(['SAFE', 'RED']),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(15000),
  description: z.string().trim().max(500).optional(),
});

export const updateDepartmentZoneSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  type: z.enum(['SAFE', 'RED']).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(100).max(15000).optional(),
  description: z.string().trim().max(500).optional(),
});

export const resolveIncidentSchema = z.object({
  notes: z.string().trim().max(300).optional(),
});

export const acknowledgeDepartmentSosSchema = z.object({
  officerId: z.string().uuid(),
});

export const createDepartmentPolicemanSchema = createPolicemanSchema;
