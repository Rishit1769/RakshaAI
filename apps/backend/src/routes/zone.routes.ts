import { Router } from 'express';
import { authenticate, authorize, requireDepartmentOrAdmin } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/zodValidate.middleware';
import * as ZoneController from '../controllers/zone.controller';
import { createZoneSchema, updateZoneSchema, zoneIdParamSchema } from '../validators/zone.validator';

const router = Router();

router.use(authenticate);

router.post('/create', requireDepartmentOrAdmin, validateBody(createZoneSchema), ZoneController.createZone);
router.get('/', authorize('admin', 'super_admin', 'SUPERADMIN', 'department', 'POLICE_DEPARTMENT', 'NGO', 'worker'), ZoneController.listZones);
router.put('/:id', requireDepartmentOrAdmin, validateParams(zoneIdParamSchema), validateBody(updateZoneSchema), ZoneController.updateZone);
router.delete('/:id', requireDepartmentOrAdmin, validateParams(zoneIdParamSchema), ZoneController.deleteZone);

export default router;
