import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validateBody } from '../middleware/zodValidate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import {
  registerSchema,
  sendOtpSchema,
  checkOtpSchema,
  verifyOtpSchema,
  loginSchema,
  setupMpinSchema,
  changeMpinSchema,
  disableMpinSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register/send-otp', authRateLimiter, validateBody(sendOtpSchema), authController.sendRegistrationOtp);
router.post('/register/check-otp', authRateLimiter, validateBody(checkOtpSchema), authController.checkRegistrationOtp);
router.post('/register/verify-otp', authRateLimiter, validateBody(verifyOtpSchema), authController.verifyRegistrationOtp);
router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/login-mpin', authRateLimiter, authController.loginWithMpin);
router.post('/refresh', validateBody(refreshTokenSchema), authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/setup-mpin', authenticate, validateBody(setupMpinSchema), authController.setupMpin);
router.post('/mpin/setup', authenticate, validateBody(setupMpinSchema), authController.setupMpin);
router.put('/mpin/change', authenticate, validateBody(changeMpinSchema), authController.changeMpin);
router.delete('/mpin/disable', authenticate, validateBody(disableMpinSchema), authController.disableMpin);
router.get('/me', authenticate, authController.getMe);

export default router;
