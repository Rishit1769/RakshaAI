import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error.middleware';
import { generateOTP, getOTPExpiry, maskEmail, maskPhone } from '../utils/helpers';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';
import { sendOTPEmail } from './email.service';

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
  role?: UserRole;
}

export interface LoginInput {
  credential: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
  mpinSet: boolean;
  profileImageUrl: string | null;
  createdAt: Date;
}

function toSafeUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
  mpinHash: string | null;
  profileImageUrl: string | null;
  createdAt: Date;
}): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isVerified: user.isVerified,
    mpinSet: !!user.mpinHash,
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt,
  };
}

export async function registerUser(input: RegisterInput): Promise<{ maskedEmail: string; maskedPhone: string }> {
  const { fullName, email, phone, aadhaarNumber, password, role = UserRole.user } = input;

  if (!(['user'] as string[]).includes(role)) {
    throw new AppError('Self-registration is only allowed for regular users', 403);
  }

  const [existingEmail, existingPhone, existingAadhaar] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { phone } }),
    prisma.user.findFirst({ where: { aadhaarNumber } }),
  ]);

  if (existingEmail) throw new AppError('Email is already registered', 409);
  if (existingPhone) throw new AppError('Phone number is already registered', 409);
  if (existingAadhaar) throw new AppError('Aadhaar number is already registered', 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { fullName, email, phone, aadhaarNumber, passwordHash, role },
  });

  await createAndSendOTP(user.id, email, 'register');
  logger.info('New user registered', { userId: user.id, role });

  return { maskedEmail: maskEmail(email), maskedPhone: maskPhone(phone) };
}

export async function verifyOTP(
  identifier: string,
  otp: string,
  purpose: 'register' | 'login' | 'reset' | 'verify' | 'mpin'
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const otpRecord = await prisma.otpVerification.findFirst({
    where: { identifier, purpose, isUsed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) throw new AppError('OTP not found or expired. Please request a new one.', 400);

  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { attempts: { increment: 1 } },
  });

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw new AppError('Maximum OTP attempts exceeded. Please request a new OTP.', 429);
  }

  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isValid) throw new AppError('Invalid OTP. Please try again.', 400);

  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user) throw new AppError('User not found', 404);

  if (purpose === 'register' && !user.isVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, isEmailVerified: true },
    });
  }

  const tokens = generateTokens(user);
  await createSession(user.id, tokens.refreshToken);
  logger.info('OTP verified', { userId: user.id, purpose });

  return { user: toSafeUser({ ...user, isVerified: true }), tokens };
}

export async function loginUser(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const { credential, password } = input;

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: credential }, { phone: credential }] },
  });
  if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) throw new AppError('Invalid credentials', 401);

  if (!user.isVerified) {
    await createAndSendOTP(user.id, user.email, 'register');
    throw new AppError('Email not verified. A new OTP has been sent.', 403);
  }

  const tokens = generateTokens(user);
  await createSession(user.id, tokens.refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info('User logged in via email+password', { userId: user.id });
  return { user: toSafeUser(user), tokens };
}

export async function loginWithMpin(
  credential: string,
  password: string,
  mpin: string
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: credential }, { phone: credential }] },
  });
  if (!user || !user.isActive) throw new AppError('Invalid credentials', 401);

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) throw new AppError('Invalid credentials', 401);

  if (!user.isVerified) throw new AppError('Account not verified', 403);
  if (!user.mpinHash) throw new AppError('MPIN not set up. Please use email login first.', 400);

  const isMpinValid = await bcrypt.compare(mpin, user.mpinHash);
  if (!isMpinValid) throw new AppError('Invalid MPIN', 401);

  const tokens = generateTokens(user);
  await createSession(user.id, tokens.refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info('User logged in via MPIN', { userId: user.id });
  return { user: toSafeUser(user), tokens };
}

export async function setupMpin(userId: string, mpin: string): Promise<void> {
  const mpinHash = await bcrypt.hash(mpin, 12);
  await prisma.user.update({ where: { id: userId }, data: { mpinHash } });
  logger.info('MPIN set up', { userId });
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const sessions = await prisma.userSession.findMany({
    where: { userId: payload.sub, isActive: true, expiresAt: { gt: new Date() } },
  });

  let matchedSession: (typeof sessions)[0] | null = null;
  for (const session of sessions) {
    const isMatch = await bcrypt.compare(refreshToken, session.tokenHash);
    if (isMatch) {
      matchedSession = session;
      break;
    }
  }
  if (!matchedSession) throw new AppError('Session not found or revoked', 401);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);

  const tokens = generateTokens(user);
  const newTokenHash = await bcrypt.hash(tokens.refreshToken, 8);

  await prisma.$transaction([
    prisma.userSession.update({ where: { id: matchedSession.id }, data: { isActive: false } }),
    prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return tokens;
}

export async function logoutUser(userId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
  logger.info('User logged out', { userId });
}

export async function resendOTP(
  identifier: string,
  purpose: 'register' | 'login' | 'reset' | 'verify' | 'mpin'
): Promise<{ maskedEmail: string }> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user) throw new AppError('No account found with this contact', 404);

  await createAndSendOTP(user.id, user.email, purpose);
  return { maskedEmail: maskEmail(user.email) };
}

async function createAndSendOTP(
  userId: string,
  email: string,
  purpose: 'register' | 'login' | 'reset' | 'verify' | 'mpin'
): Promise<void> {
  await prisma.otpVerification.updateMany({
    where: { identifier: email, purpose, isUsed: false },
    data: { isUsed: true },
  });

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.otpVerification.create({
    data: { userId, identifier: email, otpHash, purpose, expiresAt: getOTPExpiry(10) },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await sendOTPEmail({ to: email, name: user?.fullName ?? 'User', otp, purpose });
}

async function createSession(userId: string, refreshToken: string): Promise<void> {
  const tokenHash = await bcrypt.hash(refreshToken, 8);
  await prisma.userSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

function generateTokens(user: { id: string; email: string; role: UserRole }): AuthTokens {
  return {
    accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role }),
    refreshToken: signRefreshToken({ sub: user.id, tokenVersion: 1 }),
  };
}
