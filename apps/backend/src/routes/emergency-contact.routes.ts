import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/zodValidate.middleware';
import * as EmergencyContactController from '../controllers/emergency-contact.controller';
import {
  createEmergencyContactSchema,
  emergencyContactIdSchema,
  updateEmergencyContactSchema,
} from '../validators/emergency-contact.validator';

const router = Router();

router.use(authenticate);

router.get('/', EmergencyContactController.listEmergencyContacts);
router.post('/', validateBody(createEmergencyContactSchema), EmergencyContactController.createEmergencyContact);
router.put('/:id', validateParams(emergencyContactIdSchema), validateBody(updateEmergencyContactSchema), EmergencyContactController.updateEmergencyContact);
router.delete('/:id', validateParams(emergencyContactIdSchema), EmergencyContactController.deleteEmergencyContact);
router.patch('/:id/primary', validateParams(emergencyContactIdSchema), EmergencyContactController.setPrimaryEmergencyContact);

export default router;
