import { Request, Response } from 'express';
import * as CommunityService from '../services/community.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  const incidents = await CommunityService.getIncidents();
  sendSuccess(res, incidents, 'Incidents retrieved');
});

export const like = asyncHandler(async (req: Request, res: Response) => {
  const result = await CommunityService.upvoteReport(req.params.id, req.user!.id);
  sendSuccess(res, result, result.upvoted ? 'Incident liked' : 'Incident like removed');
});

export const comment = asyncHandler(async (req: Request, res: Response) => {
  const result = await CommunityService.addComment(req.params.id, req.user!.id, req.body.content as string);
  sendCreated(res, result, 'Incident comment added');
});
