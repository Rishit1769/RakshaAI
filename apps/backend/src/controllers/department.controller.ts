import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as DepartmentService from '../services/department.service';

export const getNavigationMeta = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.getNavigationMeta(req.user!.id);
  sendSuccess(res, result, 'Department navigation metadata retrieved');
});

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.getOverview(req.user!.id);
  sendSuccess(res, result, 'Department overview retrieved');
});

export const listPolicemen = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.listPolicemen(req.user!.id);
  sendSuccess(res, result, 'Department policemen retrieved');
});

export const createPoliceman = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.createPoliceman(req.user!.id, req.body as Parameters<typeof DepartmentService.createPoliceman>[1]);
  sendCreated(res, result, 'Policeman created successfully');
});

export const deactivatePoliceman = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.setPolicemanActiveState(req.user!.id, req.params.id, false);
  sendSuccess(res, result, 'Policeman deactivated');
});

export const reactivatePoliceman = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.setPolicemanActiveState(req.user!.id, req.params.id, true);
  sendSuccess(res, result, 'Policeman reactivated');
});

export const getPolicemanDetail = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.getPolicemanDetail(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Policeman detail retrieved');
});

export const listHotspots = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.listHotspots(req.user!.id);
  sendSuccess(res, result, 'Department hotspots retrieved');
});

export const createHotspot = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.createHotspot(req.user!.id, req.body as Parameters<typeof DepartmentService.createHotspot>[1]);
  sendCreated(res, result, 'Hotspot created successfully');
});

export const assignHotspot = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.assignHotspot(req.user!.id, req.params.id, (req.body as { policemanId: string }).policemanId);
  sendSuccess(res, result, 'Hotspot assigned');
});

export const unassignHotspot = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.unassignHotspot(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Hotspot assignment removed');
});

export const updateHotspot = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.updateHotspot(req.user!.id, req.params.id, req.body as Parameters<typeof DepartmentService.updateHotspot>[2]);
  sendSuccess(res, result, 'Hotspot updated');
});

export const deleteHotspot = asyncHandler(async (req: Request, res: Response) => {
  await DepartmentService.deleteHotspot(req.user!.id, req.params.id);
  sendSuccess(res, null, 'Hotspot deleted');
});

export const listIncidents = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.listIncidents(req.user!.id);
  sendSuccess(res, result, 'Department incidents retrieved');
});

export const resolveIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.resolveIncident(req.user!.id, req.params.id, (req.body as { notes?: string }).notes);
  sendSuccess(res, result, 'Incident resolved');
});

export const listSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.listSos(req.user!.id, req.query as { page?: number; pageSize?: number });
  sendSuccess(res, result, 'Department SOS alerts retrieved');
});

export const acknowledgeSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.acknowledgeSos(req.user!.id, req.params.id, (req.body as { officerId: string }).officerId);
  sendSuccess(res, result, 'SOS alert acknowledged');
});

export const resolveSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.resolveSos(req.user!.id, req.params.id);
  sendSuccess(res, result, 'SOS alert resolved');
});

export const listZones = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.listZones(req.user!.id);
  sendSuccess(res, result, 'Department zones retrieved');
});

export const createZone = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.createZone(req.user!.id, req.body as Parameters<typeof DepartmentService.createZone>[1]);
  sendCreated(res, result, 'Zone created successfully');
});

export const updateZone = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.updateZone(req.user!.id, req.params.id, req.body as Parameters<typeof DepartmentService.updateZone>[2]);
  sendSuccess(res, result, 'Zone updated');
});

export const deleteZone = asyncHandler(async (req: Request, res: Response) => {
  await DepartmentService.deleteZone(req.user!.id, req.params.id);
  sendSuccess(res, null, 'Zone deleted');
});

export const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const result = await DepartmentService.getActivity(req.user!.id);
  sendSuccess(res, result, 'Department activity retrieved');
});
