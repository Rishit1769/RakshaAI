import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rateLimiter.middleware';
import { validateBody } from '../middleware/zodValidate.middleware';
import { commentSchema, createReportSchema, upvoteSchema } from '../validators/community.validator';
import * as CommunityController from '../controllers/community.controller';

const router = Router();

// Public routes (authentication optional — anonymous reports allowed)
router.get('/', CommunityController.getReports);
router.get('/heatmap', CommunityController.heatmap);

// Authenticated routes
router.post(
  '/',
  authenticate,
  rateLimiter,
  validateBody(createReportSchema),
  CommunityController.createReport
);

router.post(
  '/upvote',
  authenticate,
  validateBody(upvoteSchema),
  CommunityController.upvoteReport
);

router.post(
  '/comments',
  authenticate,
  validateBody(commentSchema),
  CommunityController.addComment
);

export default router;
