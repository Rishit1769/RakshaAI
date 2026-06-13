import { z } from 'zod';

export const hotspotAssignParamsSchema = z.object({
  hotspotId: z.string().uuid(),
});

export const assignPolicemanSchema = z.object({
  policemanWorkerId: z.string().uuid(),
});

export type HotspotAssignParams = z.infer<typeof hotspotAssignParamsSchema>;
export type AssignPolicemanBody = z.infer<typeof assignPolicemanSchema>;
