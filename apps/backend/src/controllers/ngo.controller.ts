import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as NgoService from '../services/ngo.service';

export const getNavigationMeta = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.getNavigationMeta(req.user!.id);
  sendSuccess(res, result, 'NGO navigation metadata retrieved');
});

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.getOverview(req.user!.id);
  sendSuccess(res, result, 'NGO overview retrieved');
});

export const listVolunteers = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.listVolunteers(req.user!.id);
  sendSuccess(res, result, 'NGO volunteers retrieved');
});

export const createVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.createVolunteer(req.user!.id, req.body as Parameters<typeof NgoService.createVolunteer>[1]);
  sendCreated(res, result, 'Volunteer created successfully');
});

export const deactivateVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.setVolunteerActiveState(req.user!.id, req.params.id, false);
  sendSuccess(res, result, 'Volunteer deactivated');
});

export const reactivateVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.setVolunteerActiveState(req.user!.id, req.params.id, true);
  sendSuccess(res, result, 'Volunteer reactivated');
});

export const getVolunteerDetail = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.getVolunteerDetail(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Volunteer detail retrieved');
});

export const listOpenIncidents = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.listOpenIncidents(req.user!.id);
  sendSuccess(res, result, 'Open incidents retrieved');
});

export const listAssignedIncidents = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.listAssignedIncidents(req.user!.id);
  sendSuccess(res, result, 'Assigned incidents retrieved');
});

export const assignIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.assignIncident(req.user!.id, req.params.id, (req.body as { volunteerId: string }).volunteerId);
  sendSuccess(res, result, 'Incident assigned');
});

export const unassignIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.unassignIncident(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Incident unassigned');
});

export const closeIncident = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.closeIncident(req.user!.id, req.params.id);
  sendSuccess(res, result, 'Incident closed');
});

export const listSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.listSos(req.user!.id, req.query as { page?: number; pageSize?: number });
  sendSuccess(res, result, 'NGO SOS alerts retrieved');
});

export const respondSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.respondSos(req.user!.id, req.params.id, (req.body as { volunteerId: string }).volunteerId);
  sendSuccess(res, result, 'NGO response started');
});

export const closeSos = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.closeSos(req.user!.id, req.params.id);
  sendSuccess(res, result, 'NGO response closed');
});

export const listVisibleZones = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.listVisibleZones(req.user!.id);
  sendSuccess(res, result, 'Visible zones retrieved');
});

export const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const result = await NgoService.getActivity(req.user!.id);
  sendSuccess(res, result, 'NGO activity retrieved');
});
