import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/zodValidate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  setupMpinSchema,
  mpinLoginSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/login-mpin', authRateLimiter, validateBody(mpinLoginSchema), authController.loginWithMpin);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/setup-mpin', authenticate, validateBody(setupMpinSchema), authController.setupMpin);
router.get('/me', authenticate, authController.getMe);

export default router;
