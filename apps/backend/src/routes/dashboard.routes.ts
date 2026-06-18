import { Router } from 'express';
import { authenticate, authorize, requireNgo, requirePoliceDepartment, requireSuperAdmin } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/zodValidate.middleware';
import * as DashboardController from '../controllers/dashboard.controller';
import { officialReportSchema, userStatusBodySchema, userStatusParamSchema, volunteerCheckInSchema } from '../validators/dashboard.validator';

const router = Router();

router.use(authenticate);

router.get('/superadmin/overview', requireSuperAdmin, DashboardController.superadminOverview);
router.get('/superadmin/users', requireSuperAdmin, DashboardController.listUsers);
router.patch('/superadmin/users/:id/status', requireSuperAdmin, validateParams(userStatusParamSchema), validateBody(userStatusBodySchema), DashboardController.setUserStatus);
router.get('/superadmin/moderation', requireSuperAdmin, DashboardController.moderationQueue);
router.get('/superadmin/hotspots', requireSuperAdmin, DashboardController.hotspotOversight);
router.get('/superadmin/analytics', requireSuperAdmin, DashboardController.analytics);
router.get('/superadmin/audit', requireSuperAdmin, DashboardController.auditLogs);

router.get('/department/overview', requirePoliceDepartment, DashboardController.departmentOverview);
router.get('/department/assignments', requirePoliceDepartment, DashboardController.departmentAssignments);
router.get('/department/activity', requirePoliceDepartment, DashboardController.departmentActivity);

router.get('/ngo/overview', requireNgo, DashboardController.ngoOverview);
router.get('/ngo/response', requireNgo, DashboardController.ngoResponse);
router.get('/ngo/activity', requireNgo, DashboardController.ngoActivity);

router.get('/policeman/overview', authorize('POLICEMAN'), DashboardController.policemanOverview);
router.get('/policeman/hotspot', authorize('POLICEMAN'), DashboardController.policemanHotspot);
router.post('/policeman/report', authorize('POLICEMAN'), validateBody(officialReportSchema), DashboardController.createOfficialReport);

router.get('/volunteer/overview', authorize('VOLUNTEER'), DashboardController.volunteerOverview);
router.get('/volunteer/cases', authorize('VOLUNTEER'), DashboardController.volunteerCases);
router.post('/volunteer/check-in', authorize('VOLUNTEER'), validateBody(volunteerCheckInSchema), DashboardController.volunteerCheckIn);

export default router;
