import { Router } from 'express';
import { authenticate, requireVolunteer } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/zodValidate.middleware';
import * as VolunteerDashboardController from '../controllers/volunteer-dashboard.controller';
import {
  volunteerCheckInSchema,
  volunteerEntityParamSchema,
  volunteerIncidentMapQuerySchema,
} from '../validators/volunteer-dashboard.validator';

const router = Router();

router.use(authenticate, requireVolunteer);

router.get('/navigation-meta', VolunteerDashboardController.getNavigationMeta);
router.get('/overview', VolunteerDashboardController.getOverview);
router.get('/sos', VolunteerDashboardController.listSos);
router.patch('/sos/:id/respond', validateParams(volunteerEntityParamSchema), VolunteerDashboardController.respondSos);
router.patch('/sos/:id/close', validateParams(volunteerEntityParamSchema), VolunteerDashboardController.closeSos);
router.get('/cases', VolunteerDashboardController.listCases);
router.get('/cases/history', VolunteerDashboardController.listCaseHistory);
router.patch('/cases/:id/checkin', validateParams(volunteerEntityParamSchema), validateBody(volunteerCheckInSchema), VolunteerDashboardController.checkInCase);
router.patch('/cases/:id/close', validateParams(volunteerEntityParamSchema), VolunteerDashboardController.closeCase);
router.get('/incidents/map', validateQuery(volunteerIncidentMapQuerySchema), VolunteerDashboardController.getIncidentMap);
router.post('/checkin', validateBody(volunteerCheckInSchema), VolunteerDashboardController.createStandaloneCheckIn);
router.get('/checkin/history', VolunteerDashboardController.getCheckInHistory);
router.get('/zones', VolunteerDashboardController.getZones);

export default router;
