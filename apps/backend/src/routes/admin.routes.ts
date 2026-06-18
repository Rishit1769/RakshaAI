import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/zodValidate.middleware';
import * as HierarchyController from '../controllers/hierarchy.controller';
import {
  createDepartmentSchema,
  createNgoSchema,
  managedUserParamSchema,
} from '../validators/hierarchy.validator';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/departments', HierarchyController.listDepartments);
router.post('/departments', validateBody(createDepartmentSchema), HierarchyController.createDepartment);
router.get('/departments/:id', validateParams(managedUserParamSchema), HierarchyController.getDepartment);

router.get('/ngos', HierarchyController.listNgos);
router.post('/ngos', validateBody(createNgoSchema), HierarchyController.createNgo);
router.get('/ngos/:id', validateParams(managedUserParamSchema), HierarchyController.getNgo);

export default router;
