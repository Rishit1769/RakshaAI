import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import {
  registerVolunteerSchema,
  updateAvailabilitySchema,
  acceptAlertSchema,
} from '../validators/volunteer.validator';
import * as VolunteerController from '../controllers/volunteer.controller';

const router = Router();

router.use(authenticate);

// POST /api/volunteers/register — register as a volunteer
router.post('/register', validateBody(registerVolunteerSchema), VolunteerController.register);

// GET /api/volunteers/profile — own profile
router.get('/profile', VolunteerController.getProfile);

// PATCH /api/volunteers/availability — go available/busy/offline
router.patch(
  '/availability',
  authorize('VOLUNTEER', 'SUPERADMIN'),
  validateBody(updateAvailabilitySchema),
  VolunteerController.updateAvailability
);

// POST /api/volunteers/accept — accept an alert
router.post(
  '/accept',
  authorize('VOLUNTEER', 'SUPERADMIN'),
  validateBody(acceptAlertSchema),
  VolunteerController.acceptAlert
);

// GET /api/volunteers/alerts — active alerts feed
router.get('/alerts', authorize('VOLUNTEER', 'SUPERADMIN'), VolunteerController.getAlertsFeed);

export default router;
