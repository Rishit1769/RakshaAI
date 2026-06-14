import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as ZoneService from '../services/zone.service';

function getActor(req: Request): ZoneService.ZoneActor {
  return {
    id: req.user!.id,
    role: req.user!.role,
    departmentId: req.user!.departmentId,
  };
}

export const createZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await ZoneService.createZone(getActor(req), req.body as ZoneService.CreateZoneInput);
  sendCreated(res, zone, 'Safe zone created');
});

export const listZones = asyncHandler(async (req: Request, res: Response) => {
  const zones = await ZoneService.listZones(getActor(req));
  sendSuccess(res, zones, 'Safe zones retrieved');
});

export const updateZone = asyncHandler(async (req: Request, res: Response) => {
  const zone = await ZoneService.updateZone(getActor(req), req.params.id, req.body as ZoneService.UpdateZoneInput);
  sendSuccess(res, zone, 'Safe zone updated');
});

export const deleteZone = asyncHandler(async (req: Request, res: Response) => {
  await ZoneService.deleteZone(getActor(req), req.params.id);
  sendSuccess(res, null, 'Safe zone deleted');
});
