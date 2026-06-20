import { Router } from 'express';
import { authenticate, requireNgo } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/zodValidate.middleware';
import * as NgoController from '../controllers/ngo.controller';
import {
  createNgoVolunteerSchema,
  ngoEntityParamSchema,
  ngoIncidentAssignSchema,
  ngoSosQuerySchema,
  ngoSosRespondSchema,
} from '../validators/ngo.validator';

const router = Router();

router.use(authenticate, requireNgo);

router.get('/navigation-meta', NgoController.getNavigationMeta);
router.get('/overview', NgoController.getOverview);

router.get('/volunteers', NgoController.listVolunteers);
router.post('/volunteers', validateBody(createNgoVolunteerSchema), NgoController.createVolunteer);
router.get('/volunteers/:id', validateParams(ngoEntityParamSchema), NgoController.getVolunteerDetail);
router.patch('/volunteers/:id/deactivate', validateParams(ngoEntityParamSchema), NgoController.deactivateVolunteer);
router.patch('/volunteers/:id/reactivate', validateParams(ngoEntityParamSchema), NgoController.reactivateVolunteer);

router.get('/incidents', NgoController.listOpenIncidents);
router.get('/incidents/assigned', NgoController.listAssignedIncidents);
router.post('/incidents/:id/assign', validateParams(ngoEntityParamSchema), validateBody(ngoIncidentAssignSchema), NgoController.assignIncident);
router.delete('/incidents/:id/assign', validateParams(ngoEntityParamSchema), NgoController.unassignIncident);
router.patch('/incidents/:id/close', validateParams(ngoEntityParamSchema), NgoController.closeIncident);

router.get('/sos', validateQuery(ngoSosQuerySchema), NgoController.listSos);
router.patch('/sos/:id/respond', validateParams(ngoEntityParamSchema), validateBody(ngoSosRespondSchema), NgoController.respondSos);
router.patch('/sos/:id/close', validateParams(ngoEntityParamSchema), NgoController.closeSos);

router.get('/zones', NgoController.listVisibleZones);
router.get('/activity', NgoController.getActivity);

export default router;
