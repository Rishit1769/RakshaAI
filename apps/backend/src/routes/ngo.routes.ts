import { Router } from 'express';
import { authenticate, requireNgo } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import * as HierarchyController from '../controllers/hierarchy.controller';
import { createVolunteerSchema } from '../validators/hierarchy.validator';

const router = Router();

router.use(authenticate, requireNgo);

router.get('/volunteers', HierarchyController.listVolunteers);
router.post('/volunteers', validateBody(createVolunteerSchema), HierarchyController.createVolunteer);

export default router;
