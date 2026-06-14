import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated } from '../utils/response';
import * as RedZoneService from '../services/redzone.service';

export const triggerRedZone = asyncHandler(async (req: Request, res: Response) => {
  const record = await RedZoneService.triggerRedZone(
    {
      id: req.user!.id,
      fullName: req.user!.fullName,
      email: req.user!.email,
      phone: req.user!.phone,
      role: req.user!.role,
    },
    req.body as RedZoneService.TriggerRedZoneInput
  );

  sendCreated(res, record, 'Red zone triggered successfully');
});
