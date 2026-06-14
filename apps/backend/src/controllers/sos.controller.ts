import { Request, Response } from 'express';
import * as SosService from '../services/sos.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../utils/response';
import { SosTriggerMethod, AlertType, AlertStatus } from '@prisma/client';

/**
 * POST /api/sos
 * Creates a new SOS alert for the authenticated user.
 * This is the highest-priority endpoint - must respond in < 500ms.
 */
export const createAlert = asyncHandler(async (req: Request, res: Response) => {
  const { triggerMethod, alertType, location, description, address } = req.body as {
    triggerMethod: SosTriggerMethod;
    alertType?: AlertType;
    location?: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    description?: string;
    address?: string;
  };

  const alert = await SosService.createSosAlert({
    userId: req.user!.id,
    triggerMethod,
    alertType,
    location,
    description,
    address,
  });

  sendCreated(res, alert, 'SOS alert created. Help is on the way.');
});

/**
 * PATCH /api/sos/status
 * Updates the status of an existing alert (by owner, responder, or admin).
 */
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { alertId, newStatus, notes, latitude, longitude } = req.body as {
    alertId: string;
    newStatus: AlertStatus;
    notes?: string;
    latitude?: number;
    longitude?: number;
  };

  const alert = await SosService.updateAlertStatus({
    alertId,
    userId: req.user!.id,
    userRole: req.user!.role,
    newStatus,
    notes,
    latitude,
    longitude,
  });

  sendSuccess(res, alert, 'Alert status updated');
});

/**
 * GET /api/sos/active
 * Returns active alerts. Users see their own; responders see all.
 */
export const getActive = asyncHandler(async (req: Request, res: Response) => {
  const alerts = await SosService.getActiveAlerts(req.user!.id, req.user!.role);
  sendSuccess(res, alerts, 'Active alerts retrieved');
});

/**
 * GET /api/sos/history
 * Returns paginated alert history for the authenticated user.
 */
export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) ?? '1', 10);
  const limit = Math.min(parseInt((req.query.limit as string) ?? '20', 10), 100);
  const result = await SosService.getUserAlertHistory(req.user!.id, page, limit);
  sendSuccess(res, result, 'Alert history retrieved');
});

/**
 * GET /api/sos/:id
 * Returns a single alert by ID (owner, assigned responder, police, admin only).
 */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const alert = await SosService.getAlertById(
    req.params.id,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, alert, 'Alert retrieved');
});

/**
 * POST /api/sos/:id/cancel
 * Cancels an active SOS alert (owner only).
 */
export const cancelAlert = asyncHandler(async (req: Request, res: Response) => {
  await SosService.cancelAlert(req.params.id, req.user!.id);
  sendSuccess(res, null, 'Alert cancelled');
});
