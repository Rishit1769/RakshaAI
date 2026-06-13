import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/zodValidate.middleware';
import * as HotspotController from '../controllers/hotspot.controller';
import { assignPolicemanSchema, hotspotAssignParamsSchema } from '../validators/hotspot.validator';

const router = Router();

router.use(authenticate);

router.post(
  '/:hotspotId/assign',
  validateParams(hotspotAssignParamsSchema),
  validateBody(assignPolicemanSchema),
  HotspotController.assignPoliceman
);

export default router;
