import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import sosRoutes from './sos.routes';
import mapsRoutes from './maps.routes';
import volunteerRoutes from './volunteer.routes';
import policeRoutes from './police.routes';
import aiRoutes from './ai.routes';
import communityRoutes from './community.routes';
import organizationRoutes from './organization.routes';
import appRoutes from './app.routes';

const router = Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/sos', sosRoutes);
router.use('/maps', mapsRoutes);
router.use('/volunteers', volunteerRoutes);
router.use('/police', policeRoutes);
router.use('/ai', aiRoutes);
router.use('/community', communityRoutes);
router.use('/organizations', organizationRoutes);
router.use('/app', appRoutes);

export default router;

