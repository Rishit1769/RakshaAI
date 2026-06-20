import { Router } from 'express';
import { authenticate, requirePoliceDepartment } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/zodValidate.middleware';
import * as DepartmentController from '../controllers/department.controller';
import {
  acknowledgeDepartmentSosSchema,
  createDepartmentHotspotSchema,
  createDepartmentPolicemanSchema,
  createDepartmentZoneSchema,
  departmentEntityParamSchema,
  departmentSosQuerySchema,
  resolveIncidentSchema,
  assignDepartmentHotspotSchema,
  updateDepartmentHotspotSchema,
  updateDepartmentZoneSchema,
} from '../validators/department.validator';

const router = Router();

router.use(authenticate, requirePoliceDepartment);

router.get('/navigation-meta', DepartmentController.getNavigationMeta);
router.get('/overview', DepartmentController.getOverview);

router.get('/policemen', DepartmentController.listPolicemen);
router.post('/policemen', validateBody(createDepartmentPolicemanSchema), DepartmentController.createPoliceman);
router.get('/policemen/:id', validateParams(departmentEntityParamSchema), DepartmentController.getPolicemanDetail);
router.patch('/policemen/:id/deactivate', validateParams(departmentEntityParamSchema), DepartmentController.deactivatePoliceman);
router.patch('/policemen/:id/reactivate', validateParams(departmentEntityParamSchema), DepartmentController.reactivatePoliceman);

router.get('/hotspots', DepartmentController.listHotspots);
router.post('/hotspots', validateBody(createDepartmentHotspotSchema), DepartmentController.createHotspot);
router.post('/hotspots/:id/assign', validateParams(departmentEntityParamSchema), validateBody(assignDepartmentHotspotSchema), DepartmentController.assignHotspot);
router.delete('/hotspots/:id/assign', validateParams(departmentEntityParamSchema), DepartmentController.unassignHotspot);
router.patch('/hotspots/:id', validateParams(departmentEntityParamSchema), validateBody(updateDepartmentHotspotSchema), DepartmentController.updateHotspot);
router.delete('/hotspots/:id', validateParams(departmentEntityParamSchema), DepartmentController.deleteHotspot);

router.get('/incidents', DepartmentController.listIncidents);
router.patch('/incidents/:id/resolve', validateParams(departmentEntityParamSchema), validateBody(resolveIncidentSchema), DepartmentController.resolveIncident);

router.get('/sos', validateQuery(departmentSosQuerySchema), DepartmentController.listSos);
router.patch('/sos/:id/acknowledge', validateParams(departmentEntityParamSchema), validateBody(acknowledgeDepartmentSosSchema), DepartmentController.acknowledgeSos);
router.patch('/sos/:id/resolve', validateParams(departmentEntityParamSchema), DepartmentController.resolveSos);

router.get('/zones', DepartmentController.listZones);
router.post('/zones', validateBody(createDepartmentZoneSchema), DepartmentController.createZone);
router.patch('/zones/:id', validateParams(departmentEntityParamSchema), validateBody(updateDepartmentZoneSchema), DepartmentController.updateZone);
router.delete('/zones/:id', validateParams(departmentEntityParamSchema), DepartmentController.deleteZone);

router.get('/activity', DepartmentController.getActivity);

export default router;
