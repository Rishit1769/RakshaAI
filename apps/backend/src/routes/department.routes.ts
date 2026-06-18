import { Router } from 'express';
import { authenticate, requirePoliceDepartment } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import * as HierarchyController from '../controllers/hierarchy.controller';
import { createPolicemanSchema } from '../validators/hierarchy.validator';

const router = Router();

router.use(authenticate, requirePoliceDepartment);

router.get('/policemen', HierarchyController.listPolicemen);
router.post('/policemen', validateBody(createPolicemanSchema), HierarchyController.createPoliceman);

export default router;
