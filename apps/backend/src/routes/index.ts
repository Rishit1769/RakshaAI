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
import incidentsRoutes from './incidents.routes';
import emergencyContactRoutes from './emergency-contact.routes';
import hotspotRoutes from './hotspot.routes';
import adminRoutes from './admin.routes';
import departmentRoutes from './department.routes';
import ngoRoutes from './ngo.routes';
import dashboardRoutes from './dashboard.routes';
import zoneRoutes from './zone.routes';
import redZoneRoutes from './redzone.routes';

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
router.use('/incidents', incidentsRoutes);
router.use('/emergency-contacts', emergencyContactRoutes);
router.use('/hotspots', hotspotRoutes);
router.use('/admin', adminRoutes);
router.use('/department', departmentRoutes);
router.use('/ngo', ngoRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/zones', zoneRoutes);
router.use('/redzones', redZoneRoutes);

export default router;

