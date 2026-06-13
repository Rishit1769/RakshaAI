import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import * as HotspotService from '../services/hotspot.service';

export const assignPoliceman = asyncHandler(async (req: Request, res: Response) => {
  const hotspot = await HotspotService.assignPolicemanToHotspot(
    req.user!.id,
    req.body.policemanWorkerId,
    req.params.hotspotId
  );

  sendSuccess(res, hotspot, 'Policeman assigned to hotspot successfully');
});
