import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import * as IncidentsController from '../controllers/incidents.controller';
import { incidentCommentSchema } from '../validators/community.validator';

const router = Router();

router.get('/', IncidentsController.list);
router.post('/:id/like', authenticate, IncidentsController.like);
router.post('/:id/comments', authenticate, validateBody(incidentCommentSchema), IncidentsController.comment);

export default router;
