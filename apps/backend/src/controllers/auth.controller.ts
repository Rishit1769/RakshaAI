import { Request, Response } from 'express';
import * as AuthService from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendCreated, sendUnauthorized } from '../utils/response';
import { logger } from '../config/logger';

function attachRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

export const sendRegistrationOtp = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.sendRegistrationOtp((req.body as { email: string }).email);
  sendSuccess(res, null, 'OTP sent to your email address.');
});

export const checkRegistrationOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body as { email: string; otp: string };
  await AuthService.checkRegistrationOtp(email, otp);
  sendSuccess(res, null, 'OTP verified successfully.');
});

export const verifyRegistrationOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.verifyRegistrationOtp(req.body as AuthService.VerifyOtpInput);
  attachRefreshTokenCookie(res, result.tokens.refreshToken);
  sendCreated(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
    'Registration successful'
  );
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.registerUser(req.body as AuthService.RegisterInput);
  attachRefreshTokenCookie(res, result.tokens.refreshToken);
  sendCreated(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
    'Registration successful'
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.loginUser(req.body as AuthService.LoginInput);
  attachRefreshTokenCookie(res, result.tokens.refreshToken);
  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
    'Login successful'
  );
});

export const loginWithMpin = asyncHandler(async (req: Request, res: Response) => {
  const { credential, password, mpin } = req.body as {
    credential?: string;
    password: string;
    mpin: string;
  };
  if (!credential) {
    sendUnauthorized(res, 'No known account for MPIN login. Please use password login first.');
    return;
  }

  const result = await AuthService.loginUser({
    identifier: credential,
    credential: mpin || password,
    loginMethod: 'mpin',
  });
  attachRefreshTokenCookie(res, result.tokens.refreshToken);
  sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
    },
    'Login successful'
  );
});

export const setupMpin = asyncHandler(async (req: Request, res: Response) => {
  const { mpin } = req.body as { mpin: string };
  await AuthService.setupMpin(req.user!.id, mpin);
  sendSuccess(res, null, 'MPIN set up successfully');
});

export const changeMpin = asyncHandler(async (req: Request, res: Response) => {
  const { currentMpin, newMpin } = req.body as { currentMpin: string; newMpin: string };
  await AuthService.changeMpin(req.user!.id, currentMpin, newMpin);
  sendSuccess(res, null, 'MPIN changed successfully');
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
  sendSuccess(res, null, 'Password changed successfully');
});

export const disableMpin = asyncHandler(async (req: Request, res: Response) => {
  const { currentMpin } = req.body as { currentMpin: string };
  await AuthService.disableMpin(req.user!.id, currentMpin);
  sendSuccess(res, null, 'MPIN disabled successfully');
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token =
    (req.cookies as { refreshToken?: string })?.refreshToken ??
    (req.body as { refreshToken?: string })?.refreshToken;

  if (!token) {
    sendUnauthorized(res, 'Refresh token not provided');
    return;
  }

  const tokens = await AuthService.refreshTokens(token);
  attachRefreshTokenCookie(res, tokens.refreshToken);
  sendSuccess(res, { accessToken: tokens.accessToken }, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await AuthService.logoutUser(req.user!.id);
  res.clearCookie('refreshToken', { path: '/api/auth' });
  logger.info('User logged out', { userId: req.user!.id });
  sendSuccess(res, null, 'Logged out successfully');
});

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
      mpinEnabled: true,
      mustChangePassword: true,
      departmentId: true,
      ngoId: true,
      createdAt: true,
    },
  });

  if (!user) {
    sendUnauthorized(res, 'User not found');
    return;
  }

  sendSuccess(res, user, 'Profile retrieved');
});
