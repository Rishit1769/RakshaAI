import { Request, Response } from 'express';
import * as OrgService from '../services/organization.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/response';
import { OrganizationStatus, OrganizationType, WorkerType } from '@prisma/client';

// ─── Organization Controllers ────────────────────────────────────────────────

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const org = await OrgService.createOrganization(req.user!.id, req.body as OrgService.CreateOrganizationInput);
  sendCreated(res, org, 'Organization created successfully');
});

export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const { status, type, page, limit } = req.query as {
    status?: OrganizationStatus;
    type?: OrganizationType;
    page?: string;
    limit?: string;
  };
  const result = await OrgService.listOrganizations({
    status,
    type,
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  sendSuccess(res, result, 'Organizations retrieved');
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
  const org = await OrgService.getOrganizationById(req.params.id);
  sendSuccess(res, org, 'Organization retrieved');
});

export const approveOrganization = asyncHandler(async (req: Request, res: Response) => {
  const org = await OrgService.approveOrganization(req.params.id, req.user!.id);
  sendSuccess(res, org, 'Organization approved');
});

export const suspendOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  const org = await OrgService.suspendOrganization(req.params.id, req.user!.id, reason);
  sendSuccess(res, org, 'Organization suspended');
});

// ─── Worker Controllers ──────────────────────────────────────────────────────

export const createWorker = asyncHandler(async (req: Request, res: Response) => {
  const worker = await OrgService.createWorker(req.user!.id, req.body as OrgService.CreateWorkerInput);
  sendCreated(res, worker, 'Worker created successfully');
});

export const listWorkers = asyncHandler(async (req: Request, res: Response) => {
  const workers = await OrgService.listWorkers(req.params.orgId);
  sendSuccess(res, workers, 'Workers retrieved');
});

export const deactivateWorker = asyncHandler(async (req: Request, res: Response) => {
  const worker = await OrgService.deactivateWorker(req.params.id, req.user!.id);
  sendSuccess(res, worker, 'Worker deactivated');
});
