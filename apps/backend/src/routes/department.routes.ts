import { Router } from 'express';
import { authenticate, requireDepartment } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import * as OnboardingController from '../controllers/onboarding.controller';
import { departmentOnboardWorkerSchema } from '../validators/onboarding.validator';

const router = Router();

router.use(authenticate, requireDepartment);

router.post('/onboard-worker', validateBody(departmentOnboardWorkerSchema), OnboardingController.departmentOnboardWorker);

export default router;
