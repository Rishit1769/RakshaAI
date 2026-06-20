import { Router } from 'express';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/zodValidate.middleware';
import * as AdminController from '../controllers/admin.controller';
import {
  createDepartmentSchema,
  createNgoSchema,
} from '../validators/hierarchy.validator';
import {
  auditLogQuerySchema,
  emailCheckQuerySchema,
  hotspotStatusBodySchema,
  managedEntityParamSchema,
  moderationDismissBodySchema,
  toggleSuspensionBodySchema,
  updateUserRoleBodySchema,
  userListQuerySchema,
} from '../validators/admin.validator';

const router = Router();

router.use(authenticate, requireSuperAdmin);

router.get('/navigation-meta', AdminController.getNavigationMeta);
router.get('/overview', AdminController.getOverview);

router.get('/users', validateQuery(userListQuerySchema), AdminController.listUsers);
router.patch('/users/:id/role', validateParams(managedEntityParamSchema), validateBody(updateUserRoleBodySchema), AdminController.updateUserRole);
router.patch('/users/:id/suspend', validateParams(managedEntityParamSchema), validateBody(toggleSuspensionBodySchema), AdminController.toggleUserSuspension);
router.delete('/users/:id', validateParams(managedEntityParamSchema), AdminController.deleteUser);

router.get('/check-email', validateQuery(emailCheckQuerySchema), AdminController.checkEmail);

router.get('/departments', AdminController.listDepartments);
router.post('/departments', validateBody(createDepartmentSchema), AdminController.createDepartment);
router.delete('/departments/:id', validateParams(managedEntityParamSchema), AdminController.deleteDepartment);

router.get('/ngos', AdminController.listNgos);
router.post('/ngos', validateBody(createNgoSchema), AdminController.createNgo);
router.delete('/ngos/:id', validateParams(managedEntityParamSchema), AdminController.deleteNgo);

router.get('/hotspots', AdminController.listHotspots);
router.get('/hotspots/:id', validateParams(managedEntityParamSchema), AdminController.getHotspotDetail);
router.patch('/hotspots/:id/status', validateParams(managedEntityParamSchema), validateBody(hotspotStatusBodySchema), AdminController.updateHotspotStatus);

router.get('/analytics/sos', AdminController.getSosAnalytics);

router.get('/moderation/queue', AdminController.getModerationQueue);
router.post('/moderation/:id/dismiss', validateParams(managedEntityParamSchema), validateBody(moderationDismissBodySchema), AdminController.dismissModerationItem);
router.delete('/moderation/incident/:id', validateParams(managedEntityParamSchema), AdminController.deleteModerationIncident);
router.delete('/moderation/comment/:id', validateParams(managedEntityParamSchema), AdminController.deleteModerationComment);
router.patch('/moderation/user/:id/ban', validateParams(managedEntityParamSchema), AdminController.banModerationUser);

router.get('/audit-log', validateQuery(auditLogQuerySchema), AdminController.getAuditLog);

export default router;
