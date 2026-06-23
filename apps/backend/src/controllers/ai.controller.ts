import { Request, Response } from 'express';
import * as AiService from '../services/ai.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';

/**
 * POST /api/ai/classify
 * Classify an emergency description using Gemini AI
 */
export const classify = asyncHandler(async (req: Request, res: Response) => {
  if (!process.env.GEMINI_API_KEY?.trim()) throw new AppError('AI service is not configured', 503);

  const result = await AiService.classifyEmergency(req.body.description as string);
  sendSuccess(res, result, 'Emergency classified');
});

/**
 * POST /api/ai/risk-analysis
 * Analyze area risk for given coordinates
 */
export const riskAnalysis = asyncHandler(async (req: Request, res: Response) => {
  if (!process.env.GEMINI_API_KEY?.trim()) throw new AppError('AI service is not configured', 503);

  const { latitude, longitude, timeOfDay } = req.body as {
    latitude: number;
    longitude: number;
    timeOfDay?: string;
  };

  // Fetch local incident data to enrich the prompt
  const { prisma } = await import('../config/database');
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const recentIncidents = await prisma.communityReport.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const safeZonesNearby = await prisma.safeZone.count({
    where: { isActive: true, isVerified: true },
  });

  const result = await AiService.analyzeRisk(latitude, longitude, {
    recentIncidents,
    safeZonesNearby,
    timeOfDay,
  });

  sendSuccess(res, result, 'Risk analysis complete');
});

/**
 * POST /api/ai/chat
 * Chat with the RakshaAI safety assistant
 */
export const chat = asyncHandler(async (req: Request, res: Response) => {
  if (!process.env.GEMINI_API_KEY?.trim()) throw new AppError('AI service is not configured', 503);

  const body = req.body as { history: AiService.ChatMessage[]; message: string };
  const reply = await AiService.chatWithAssistant(req.user!.id, body.history ?? [], body.message);
  sendSuccess(res, { reply }, 'Response generated');
});
