import { Router } from 'express';
import { authenticate, requirePoliceman } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/zodValidate.middleware';
import * as OfficerController from '../controllers/officer.controller';
import { officerEntityParamSchema, officerIncidentsQuerySchema, officerReportSchema } from '../validators/officer.validator';

const router = Router();

router.use(authenticate, requirePoliceman);

router.get('/navigation-meta', OfficerController.getNavigationMeta);
router.get('/overview', OfficerController.getOverview);
router.get('/hotspot', OfficerController.getHotspot);
router.get('/sos', OfficerController.listSos);
router.patch('/sos/:id/acknowledge', validateParams(officerEntityParamSchema), OfficerController.acknowledgeSos);
router.patch('/sos/:id/resolve', validateParams(officerEntityParamSchema), OfficerController.resolveSos);
router.get('/incidents', validateQuery(officerIncidentsQuerySchema), OfficerController.listIncidents);
router.patch('/incidents/:id/resolve', validateParams(officerEntityParamSchema), OfficerController.resolveIncident);
router.post('/incidents', validateBody(officerReportSchema), OfficerController.createIncident);

export default router;
