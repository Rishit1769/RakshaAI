import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import * as RedZoneController from '../controllers/redzone.controller';
import { triggerRedZoneSchema } from '../validators/redzone.validator';

const router = Router();

router.use(authenticate);

router.post('/trigger', validateBody(triggerRedZoneSchema), RedZoneController.triggerRedZone);

export default router;
