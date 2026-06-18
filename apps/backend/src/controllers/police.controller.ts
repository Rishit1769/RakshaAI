import { Request, Response } from 'express';
import * as PoliceService from '../services/police.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  throw new AppError('Public police account registration has been disabled. Policeman accounts must be created by a police department.', 403);
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const account = await PoliceService.getPoliceProfile(req.user!.id);
  sendSuccess(res, account, 'Police profile retrieved');
});

export const assignAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await PoliceService.assignAlert(req.user!.id, req.body.alertId);
  sendSuccess(res, alert, 'Alert assigned to police officer');
});

export const escalateAlert = asyncHandler(async (req: Request, res: Response) => {
  const alert = await PoliceService.escalateAlert(req.user!.id, req.body.alertId, req.body.reason);
  sendSuccess(res, alert, 'Alert escalated');
});

export const setDutyStatus = asyncHandler(async (req: Request, res: Response) => {
  const account = await PoliceService.setDutyStatus(req.user!.id, req.body.isOnDuty);
  sendSuccess(res, account, 'Duty status updated');
});

export const getAlertsFeed = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await PoliceService.getAlertsFeed(req.user!.id);
  sendSuccess(res, alerts, 'Alerts feed retrieved');
});
