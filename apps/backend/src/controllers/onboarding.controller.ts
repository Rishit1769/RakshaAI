import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as OnboardingService from '../services/onboarding.service';

export const adminOnboard = asyncHandler(async (req: Request, res: Response) => {
  const user = await OnboardingService.adminOnboardUser(req.user!.id, req.body as OnboardingService.AdminOnboardInput);
  sendCreated(res, user, 'User onboarded successfully');
});

export const departmentOnboardWorker = asyncHandler(async (req: Request, res: Response) => {
  const user = await OnboardingService.departmentOnboardWorker(
    req.user!.id,
    req.user!.departmentId!,
    req.body as OnboardingService.DepartmentOnboardWorkerInput
  );
  sendCreated(res, user, 'Worker onboarded successfully');
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { isActive } = req.body as { isActive: boolean };
  const user = await OnboardingService.setUserActiveStatus(req.params.id, isActive);
  sendSuccess(res, user, isActive ? 'User reactivated' : 'User deactivated');
});
