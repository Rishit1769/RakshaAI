import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/zodValidate.middleware';
import {
  createSosSchema,
  updateSosStatusSchema,
  alertIdParamSchema,
  alertHistoryQuerySchema,
} from '../validators/sos.validator';
import * as SosController from '../controllers/sos.controller';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// All SOS routes require authentication
router.use(authenticate);

/**
 * POST /api/sos
 * Create a new SOS alert — highest priority, light rate limit to prevent abuse.
 */
router.post(
  '/',
  authRateLimiter,
  validateBody(createSosSchema),
  SosController.createAlert
);

/**
 * PATCH /api/sos/status
 * Update alert status (owner / responder / admin).
 */
router.patch(
  '/status',
  validateBody(updateSosStatusSchema),
  SosController.updateStatus
);

/**
 * GET /api/sos/active
 * Fetch active alerts (own for users, all for responders/admins).
 */
router.get('/active', SosController.getActive);

/**
 * GET /api/sos/history
 * Paginated alert history for the authenticated user.
 */
router.get(
  '/history',
  validateQuery(alertHistoryQuerySchema),
  SosController.getHistory
);

/**
 * GET /api/sos/:id
 * Fetch a single alert by ID.
 */
router.get(
  '/:id',
  validateParams(alertIdParamSchema),
  SosController.getById
);

/**
 * POST /api/sos/:id/cancel
 * Cancel an active alert (owner only).
 */
router.post(
  '/:id/cancel',
  validateParams(alertIdParamSchema),
  SosController.cancelAlert
);

export default router;
