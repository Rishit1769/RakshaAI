import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendUnauthorized } from '../utils/response';
import { logger } from '../config/logger';

/**
 * POST /api/auth/register
 * Registers a new user and sends OTP to email.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body as AuthService.RegisterInput);
  sendCreated(res, result, 'Registration successful. OTP sent to your email.');
});

/**
 * POST /api/auth/verify-otp
 * Verifies the submitted OTP and returns auth tokens.
 */
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, otp, purpose } = req.body as {
    identifier: string;
    otp: string;
    purpose: 'register' | 'login' | 'reset' | 'verify';
  };

  const result = await AuthService.verifyOTP(identifier, otp, purpose);

  // Set refresh token as HttpOnly cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth',
  });

  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
    'Verification successful'
  );
});

/**
 * POST /api/auth/login
 * Validates credentials and logs user in directly (email+password flow).
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body as AuthService.LoginInput);
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  sendSuccess(res, { user: result.user, accessToken: result.tokens.accessToken }, 'Login successful');
});

/**
 * POST /api/auth/login-mpin
 * Authenticates with email + password + MPIN. Returns tokens immediately (no OTP step).
 */
export const loginWithMpin = asyncHandler(async (req: Request, res: Response) => {
  const { credential, password, mpin } = req.body as {
    credential?: string;
    password: string;
    mpin: string;
  };
  if (!credential) {
    sendUnauthorized(res, 'No known account for MPIN login on this device. Use Email + Password once.');
    return;
  }
  const result = await AuthService.loginWithMpin(credential, password, mpin);

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  sendSuccess(res, { user: result.user, accessToken: result.tokens.accessToken }, 'Login successful');
});

/**
 * POST /api/auth/setup-mpin
 * Sets or updates MPIN for an authenticated user (after email verification).
 */
export const setupMpin = asyncHandler(async (req: Request, res: Response) => {
  const { mpin } = req.body as { mpin: string };
  await AuthService.setupMpin(req.user!.id, mpin);
  sendSuccess(res, null, 'MPIN set up successfully');
});

/**
 * POST /api/auth/refresh
 * Refreshes access token using refresh token from cookie or body.
 */
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  // Accept from HttpOnly cookie (preferred) or request body (mobile)
  const token =
    (req.cookies as { refreshToken?: string })?.refreshToken ??
    (req.body as { refreshToken?: string })?.refreshToken;

  if (!token) {
    sendUnauthorized(res, 'Refresh token not provided');
    return;
  }

  const tokens = await AuthService.refreshTokens(token);

  // Rotate cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });

  sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
});

/**
 * POST /api/auth/logout
 * Revokes all active sessions for the authenticated user.
 */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.logoutUser(req.user!.id);

  // Clear cookie
  res.clearCookie('refreshToken', { path: '/api/auth' });

  logger.info('User logged out', { userId: req.user!.id });
  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * POST /api/auth/resend-otp
 * Resends OTP to the provided identifier.
 */
export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, purpose } = req.body as {
    identifier: string;
    purpose: 'register' | 'login' | 'reset' | 'verify';
  };
  const result = await AuthService.resendOTP(identifier, purpose);
  sendSuccess(res, result, 'OTP resent successfully');
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const { prisma } = await import('../config/database');
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      profileImageUrl: true,
      createdAt: true,
    },
  });
  if (!user) {
    sendUnauthorized(res, 'User not found');
    return;
  }
  sendSuccess(res, user, 'Profile retrieved');
});
