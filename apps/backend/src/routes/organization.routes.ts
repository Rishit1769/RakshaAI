import { Router } from 'express';
import * as orgController from '../controllers/organization.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Organization routes (Super Admin only) ──────────────────────────────────
router.post('/', authorize('super_admin', 'admin'), orgController.createOrganization);
router.get('/', authorize('super_admin', 'admin', 'organization_admin'), orgController.listOrganizations);
router.get('/:id', authorize('super_admin', 'admin', 'organization_admin'), orgController.getOrganization);
router.patch('/:id/approve', authorize('super_admin', 'admin'), orgController.approveOrganization);
router.patch('/:id/suspend', authorize('super_admin', 'admin'), orgController.suspendOrganization);

// ─── Worker routes (Organization Admin only) ─────────────────────────────────
router.post('/workers', authorize('organization_admin'), orgController.createWorker);
router.get('/:orgId/workers', authorize('super_admin', 'admin', 'organization_admin'), orgController.listWorkers);
router.patch('/workers/:id/deactivate', authorize('organization_admin'), orgController.deactivateWorker);

export default router;
