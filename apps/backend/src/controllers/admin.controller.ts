import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as AdminService from '../services/admin.service';
import * as HierarchyService from '../services/hierarchy.service';

export const getNavigationMeta = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.getNavigationMeta(req.user!.id);
  sendSuccess(res, result, 'Admin navigation metadata retrieved');
});

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  const result = await AdminService.getOverview();
  sendSuccess(res, result, 'Admin overview retrieved');
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.listUsers(req.query as Parameters<typeof AdminService.listUsers>[0]);
  sendSuccess(res, result, 'Users retrieved');
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.updateUserRole(req.params.id, (req.body as { role: Parameters<typeof AdminService.updateUserRole>[1] }).role, req.user!.id);
  sendSuccess(res, result, 'User role updated');
});

export const toggleUserSuspension = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.toggleUserSuspension(req.params.id, (req.body as { isSuspended: boolean }).isSuspended, req.user!.id);
  sendSuccess(res, result, 'User status updated');
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.deleteUser(req.params.id, req.user!.id);
  sendSuccess(res, result, 'User deleted');
});

export const checkEmail = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.checkEmailAvailability(String(req.query.email ?? ''));
  sendSuccess(res, result, 'Email availability checked');
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const result = await HierarchyService.createDepartment(req.user!.id, req.body as Parameters<typeof HierarchyService.createDepartment>[1]);
  sendCreated(res, result, 'Police department account created successfully');
});

export const createNgo = asyncHandler(async (req: Request, res: Response) => {
  const result = await HierarchyService.createNgo(req.user!.id, req.body as Parameters<typeof HierarchyService.createNgo>[1]);
  sendCreated(res, result, 'NGO account created successfully');
});

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const result = await AdminService.listDepartments();
  sendSuccess(res, result, 'Police departments retrieved');
});

export const listNgos = asyncHandler(async (_req: Request, res: Response) => {
  const result = await AdminService.listNgos();
  sendSuccess(res, result, 'NGOs retrieved');
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.deleteDepartment(req.params.id, req.user!.id);
  sendSuccess(res, result, 'Police department archived');
});

export const deleteNgo = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.deleteNgo(req.params.id, req.user!.id);
  sendSuccess(res, result, 'NGO archived');
});

export const listHotspots = asyncHandler(async (_req: Request, res: Response) => {
  const result = await AdminService.listHotspots();
  sendSuccess(res, result, 'Hotspots retrieved');
});

export const getHotspotDetail = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.getHotspotDetail(req.params.id);
  sendSuccess(res, result, 'Hotspot detail retrieved');
});

export const updateHotspotStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.updateHotspotStatus(req.params.id, (req.body as { status: 'ACTIVE' | 'INACTIVE' }).status, req.user!.id);
  sendSuccess(res, result, 'Hotspot status updated');
});

export const getSosAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const result = await AdminService.getSosAnalytics();
  sendSuccess(res, result, 'SOS analytics retrieved');
});

export const getModerationQueue = asyncHandler(async (_req: Request, res: Response) => {
  const result = await AdminService.getModerationQueue();
  sendSuccess(res, result, 'Moderation queue retrieved');
});

export const dismissModerationItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.dismissModerationItem(req.params.id, (req.body as { type: 'incident' | 'comment' }).type, req.user!.id);
  sendSuccess(res, result, 'Moderation item dismissed');
});

export const deleteModerationIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.deleteModerationIncident(req.params.id, req.user!.id);
  sendSuccess(res, result, 'Incident removed');
});

export const deleteModerationComment = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.deleteModerationComment(req.params.id, req.user!.id);
  sendSuccess(res, result, 'Comment removed');
});

export const banModerationUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.banModerationUser(req.params.id, req.user!.id);
  sendSuccess(res, result, 'Author banned');
});

export const getAuditLog = asyncHandler(async (req: Request, res: Response) => {
  const result = await AdminService.getAuditLog(req.query as Parameters<typeof AdminService.getAuditLog>[0]);
  sendSuccess(res, result, 'Audit log retrieved');
});
