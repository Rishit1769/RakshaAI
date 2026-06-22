import { z } from 'zod';

export const classifyEmergencySchema = z.object({
  description: z.string().min(5).max(1000),
});

export const riskAnalysisSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timeOfDay: z.string().optional(),
});

export const chatSchema = z.object({
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        content: z.string().min(1).max(2000),
      })
    )
    .max(20),
  message: z.string().min(1).max(2000),
});

export type ClassifyEmergencyBody = z.infer<typeof classifyEmergencySchema>;
export type RiskAnalysisBody = z.infer<typeof riskAnalysisSchema>;
export type ChatBody = z.infer<typeof chatSchema>;
