import { Request, Response } from 'express';
import * as CommunityService from '../services/community.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/response';
import type { ReportCategory } from '@prisma/client';

export const createReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await CommunityService.createReport({
    reporterId: req.user?.id,
    ...req.body,
  });
  sendCreated(res, report, 'Report submitted successfully');
});

export const getReports = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const category = req.query.category as ReportCategory | undefined;

  const result = await CommunityService.getReports({ category, page, limit });
  sendSuccess(res, result, 'Reports retrieved');
});

export const upvoteReport = asyncHandler(async (req: Request, res: Response) => {
  const result = await CommunityService.upvoteReport(req.body.reportId as string, req.user!.id);
  sendSuccess(res, result, result.upvoted ? 'Upvoted' : 'Upvote removed');
});

export const heatmap = asyncHandler(async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string) || 20.5937;
  const lng = parseFloat(req.query.longitude as string) || 78.9629;
  const radius = parseFloat(req.query.radius as string) || 50;

  const points = await CommunityService.getHeatmapData(radius, lat, lng);
  sendSuccess(res, points, 'Heatmap data retrieved');
});
