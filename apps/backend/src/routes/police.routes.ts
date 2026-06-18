import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import {
  createPoliceAccountSchema,
  assignAlertSchema,
  escalateAlertSchema,
  dutyStatusSchema,
} from '../validators/police.validator';
import * as PoliceController from '../controllers/police.controller';

const router = Router();

router.use(authenticate);

// POST /api/police/register — register police account
router.post('/register', validateBody(createPoliceAccountSchema), PoliceController.createAccount);

// GET /api/police/profile — own profile
router.get('/profile', PoliceController.getProfile);

// PATCH /api/police/duty — toggle on-duty status
router.patch(
  '/duty',
  authorize('POLICEMAN', 'SUPERADMIN'),
  validateBody(dutyStatusSchema),
  PoliceController.setDutyStatus
);

// POST /api/police/assign — assign alert to self
router.post(
  '/assign',
  authorize('POLICEMAN', 'SUPERADMIN'),
  validateBody(assignAlertSchema),
  PoliceController.assignAlert
);

// POST /api/police/escalate — escalate alert
router.post(
  '/escalate',
  authorize('POLICEMAN', 'SUPERADMIN'),
  validateBody(escalateAlertSchema),
  PoliceController.escalateAlert
);

// GET /api/police/alerts — all active/escalated alerts feed
router.get('/alerts', authorize('POLICEMAN', 'SUPERADMIN'), PoliceController.getAlertsFeed);

export default router;
