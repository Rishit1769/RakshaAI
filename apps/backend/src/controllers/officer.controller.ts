import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as OfficerService from '../services/officer.service';

export const getNavigationMeta = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.getNavigationMeta(req.user!.id);
  sendSuccess(res, result, 'Officer navigation metadata retrieved');
});

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.getOverview(req.user!.id);
  sendSuccess(res, result, 'Officer overview retrieved');
});

export const getHotspot = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.getHotspot(req.user!.id);
  sendSuccess(res, result, 'Officer hotspot retrieved');
});

export const listSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.listSos(req.user!.id);
  sendSuccess(res, result, 'Officer SOS alerts retrieved');
});

export const acknowledgeSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.acknowledgeSos(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Officer SOS alert acknowledged');
});

export const resolveSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.resolveSos(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Officer SOS alert resolved');
});

export const listIncidents = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as { radius?: number; lat?: number; lng?: number };
  const result = await OfficerService.listIncidents(
    req.user!.id,
    Number(query.radius ?? 5),
    query.lat !== undefined ? Number(query.lat) : undefined,
    query.lng !== undefined ? Number(query.lng) : undefined
  );
  sendSuccess(res, result, 'Officer incidents retrieved');
});

export const resolveIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.resolveIncident(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Officer incident resolved');
});

export const createIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await OfficerService.createIncident(req.user!.id, req.body as Parameters<typeof OfficerService.createIncident>[1]);
  sendCreated(res, result, 'Officer incident report submitted');
});
