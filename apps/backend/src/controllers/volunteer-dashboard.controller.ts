import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as VolunteerDashboardService from '../services/volunteer-dashboard.service';

export const getNavigationMeta = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.getNavigationMeta(req.user!.id);
  sendSuccess(res, result, 'Volunteer navigation metadata retrieved');
});

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.getOverview(req.user!.id);
  sendSuccess(res, result, 'Volunteer overview retrieved');
});

export const listSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.listSos(req.user!.id);
  sendSuccess(res, result, 'Volunteer SOS alerts retrieved');
});

export const respondSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.respondSos(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Volunteer marked as responding');
});

export const closeSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.closeSos(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Volunteer response closed');
});

export const listCases = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.listCases(req.user!.id);
  sendSuccess(res, result, 'Volunteer cases retrieved');
});

export const listCaseHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.listCaseHistory(req.user!.id);
  sendSuccess(res, result, 'Volunteer case history retrieved');
});

export const checkInCase = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.checkInCase(req.user!.id, req.params.id, req.body as Parameters<typeof VolunteerDashboardService.checkInCase>[2]);
  sendSuccess(res, result, 'Volunteer case check-in recorded');
});

export const closeCase = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.closeCase(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Volunteer case closed');
});

export const getIncidentMap = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.getIncidentMap(req.user!.id, Number((req.query as { days?: number }).days ?? 7));
  sendSuccess(res, result, 'Volunteer incident map data retrieved');
});

export const createStandaloneCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.createStandaloneCheckIn(req.user!.id, req.body as Parameters<typeof VolunteerDashboardService.createStandaloneCheckIn>[1]);
  sendCreated(res, result, 'Volunteer check-in recorded');
});

export const getCheckInHistory = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.getCheckInHistory(req.user!.id);
  sendSuccess(res, result, 'Volunteer check-in history retrieved');
});

export const getZones = asyncHandler(async (req: Request, res: Response) => {
  const result = await VolunteerDashboardService.getZones(req.user!.id);
  sendSuccess(res, result, 'Volunteer visible zones retrieved');
});
