import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/zodValidate.middleware';
import * as OnboardingController from '../controllers/onboarding.controller';
import { adminOnboardSchema, userStatusBodySchema, userStatusParamSchema } from '../validators/onboarding.validator';

const router = Router();

router.use(authenticate, requireAdmin);

router.post('/onboard', validateBody(adminOnboardSchema), OnboardingController.adminOnboard);
router.patch('/users/:id/status', validateParams(userStatusParamSchema), validateBody(userStatusBodySchema), OnboardingController.setUserStatus);

export default router;
