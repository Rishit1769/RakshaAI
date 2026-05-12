import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import * as MapsController from '../controllers/maps.controller';

const router = Router();

router.use(authenticate);
router.use(rateLimiter);

router.get('/nearby/volunteers', MapsController.nearbyVolunteers);
router.get('/nearby/police', MapsController.nearbyPolice);
router.get('/nearby/safe-zones', MapsController.nearbySafeZones);
router.get('/risk', MapsController.areaRisk);

export default router;
