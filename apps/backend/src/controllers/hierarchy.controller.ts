import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendCreated, sendSuccess } from '../utils/response';
import * as HierarchyService from '../services/hierarchy.service';

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await HierarchyService.createDepartment(req.user!.id, req.body as Parameters<typeof HierarchyService.createDepartment>[1]);
  sendCreated(res, department, 'Police department account created successfully');
});

export const createNgo = asyncHandler(async (req: Request, res: Response) => {
  const ngo = await HierarchyService.createNgo(req.user!.id, req.body as Parameters<typeof HierarchyService.createNgo>[1]);
  sendCreated(res, ngo, 'NGO account created successfully');
});

export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await HierarchyService.listDepartments();
  sendSuccess(res, departments, 'Police departments retrieved');
});

export const listNgos = asyncHandler(async (_req: Request, res: Response) => {
  const ngos = await HierarchyService.listNgos();
  sendSuccess(res, ngos, 'NGOs retrieved');
});

export const getDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await HierarchyService.getDepartmentById(req.params.id);
  sendSuccess(res, department, 'Police department retrieved');
});

export const getNgo = asyncHandler(async (req: Request, res: Response) => {
  const ngo = await HierarchyService.getNgoById(req.params.id);
  sendSuccess(res, ngo, 'NGO retrieved');
});

export const createPoliceman = asyncHandler(async (req: Request, res: Response) => {
  const policeman = await HierarchyService.createPoliceman(req.user!.id, req.body as Parameters<typeof HierarchyService.createPoliceman>[1]);
  sendCreated(res, policeman, 'Policeman account created successfully');
});

export const listPolicemen = asyncHandler(async (req: Request, res: Response) => {
  const policemen = await HierarchyService.listDepartmentPolicemen(req.user!.id);
  sendSuccess(res, policemen, 'Department policemen retrieved');
});

export const createVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const volunteer = await HierarchyService.createVolunteer(req.user!.id, req.body as Parameters<typeof HierarchyService.createVolunteer>[1]);
  sendCreated(res, volunteer, 'Volunteer account created successfully');
});

export const listVolunteers = asyncHandler(async (req: Request, res: Response) => {
  const volunteers = await HierarchyService.listNgoVolunteers(req.user!.id);
  sendSuccess(res, volunteers, 'NGO volunteers retrieved');
});
