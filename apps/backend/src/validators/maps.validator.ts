import { z } from 'zod';

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);
const radiusSchema = z.number().min(0.1).max(50);

export const nearbyQuerySchema = z.object({
  latitude: z.string().transform(Number).pipe(latSchema),
  longitude: z.string().transform(Number).pipe(lngSchema),
  radius: z.string().optional().default('5').transform(Number).pipe(radiusSchema),
});

export type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
