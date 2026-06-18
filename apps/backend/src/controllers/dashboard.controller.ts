import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as DashboardService from '../services/dashboard.service';

export const superadminOverview = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getSuperadminOverview();
  sendSuccess(res, result, 'Superadmin overview retrieved');
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.listAllUsers();
  sendSuccess(res, result, 'Users retrieved');
});

export const setUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.setUserStatus(req.params.id, (req.body as { isActive: boolean }).isActive, req.user!.id);
  sendSuccess(res, result, 'User status updated');
});

export const moderationQueue = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getModerationQueue();
  sendSuccess(res, result, 'Moderation queue retrieved');
});

export const hotspotOversight = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getHotspotOversight();
  sendSuccess(res, result, 'Hotspots retrieved');
});

export const analytics = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getSuperadminAnalytics();
  sendSuccess(res, result, 'Analytics retrieved');
});

export const auditLogs = asyncHandler(async (_req: Request, res: Response) => {
  const result = await DashboardService.getAuditLogs();
  sendSuccess(res, result, 'Audit logs retrieved');
});

export const departmentOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getDepartmentOverview(req.user!.id);
  sendSuccess(res, result, 'Department overview retrieved');
});

export const departmentAssignments = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getDepartmentAssignments(req.user!.id);
  sendSuccess(res, result, 'Department assignments retrieved');
});

export const departmentActivity = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getDepartmentActivity(req.user!.id);
  sendSuccess(res, result, 'Department activity retrieved');
});

export const ngoOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getNgoOverview(req.user!.id);
  sendSuccess(res, result, 'NGO overview retrieved');
});

export const ngoResponse = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getNgoResponse(req.user!.id);
  sendSuccess(res, result, 'NGO response workspace retrieved');
});

export const ngoActivity = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getNgoActivity(req.user!.id);
  sendSuccess(res, result, 'NGO activity retrieved');
});

export const policemanOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getPolicemanOverview(req.user!.id);
  sendSuccess(res, result, 'Policeman overview retrieved');
});

export const policemanHotspot = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getPolicemanHotspot(req.user!.id);
  sendSuccess(res, result, 'Policeman hotspot data retrieved');
});

export const volunteerOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getVolunteerOverview(req.user!.id);
  sendSuccess(res, result, 'Volunteer overview retrieved');
});

export const volunteerCases = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.getVolunteerCases(req.user!.id);
  sendSuccess(res, result, 'Volunteer cases retrieved');
});

export const createOfficialReport = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.createOfficialReport(req.user!.id, req.body as Parameters<typeof DashboardService.createOfficialReport>[1]);
  sendCreated(res, result, 'Official report submitted');
});

export const volunteerCheckIn = asyncHandler(async (req: Request, res: Response) => {
  const result = await DashboardService.createVolunteerCheckIn(req.user!.id, req.body as Parameters<typeof DashboardService.createVolunteerCheckIn>[1]);
  sendCreated(res, result, 'Volunteer check-in recorded');
});
