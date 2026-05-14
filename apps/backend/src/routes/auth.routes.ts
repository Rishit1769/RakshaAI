import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/zodValidate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  registerSchema,
  verifyOTPSchema,
  loginSchema,
  refreshTokenSchema,
  resendOTPSchema,
  setupMpinSchema,
  mpinLoginSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/verify-otp', otpRateLimiter, validateBody(verifyOTPSchema), authController.verifyOTP);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/login-mpin', authRateLimiter, validateBody(mpinLoginSchema), authController.loginWithMpin);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/resend-otp', otpRateLimiter, validateBody(resendOTPSchema), authController.resendOTP);
router.post('/setup-mpin', authenticate, validateBody(setupMpinSchema), authController.setupMpin);
router.get('/me', authenticate, authController.getMe);

export default router;
