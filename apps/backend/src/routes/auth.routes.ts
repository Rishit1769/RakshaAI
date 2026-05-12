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
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register);
router.post('/verify-otp', otpRateLimiter, validateBody(verifyOTPSchema), authController.verifyOTP);
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);
router.post('/login-mpin', authRateLimiter, authController.loginWithMpin);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/resend-otp', otpRateLimiter, validateBody(resendOTPSchema), authController.resendOTP);
router.post('/setup-mpin', authenticate, validateBody(setupMpinSchema), authController.setupMpin);
router.get('/me', authenticate, authController.getMe);

export default router;


const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account — sends OTP to email.
 */
router.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  authController.register
);

/**
 * POST /api/auth/verify-otp
 * Verify OTP and receive auth tokens.
 */
router.post(
  '/verify-otp',
  otpRateLimiter,
  validateBody(verifyOTPSchema),
  authController.verifyOTP
);

/**
 * POST /api/auth/login
 * Authenticate with email+password — triggers login OTP.
 */
router.post(
  '/login',
  authRateLimiter,
  validateBody(loginSchema),
  authController.login
);

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token.
 * Accepts token from HttpOnly cookie (web) or request body (mobile).
 */
router.post(
  '/refresh',
  authController.refreshToken
);

/**
 * POST /api/auth/logout
 * Revoke all sessions — requires valid access token.
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * POST /api/auth/resend-otp
 * Resend OTP to email.
 */
router.post(
  '/resend-otp',
  otpRateLimiter,
  validateBody(resendOTPSchema),
  authController.resendOTP
);

/**
 * GET /api/auth/me
 * Get current user profile — requires authentication.
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

export default router;
