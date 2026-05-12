import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOTP, getOTPExpiry, maskEmail, maskPhone } from '../utils/helpers';
import { sendOTPEmail } from './email.service';
import { AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger';
import bcrypt from 'bcryptjs';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
  deviceType?: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
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
  profileImageUrl: string | null;
  createdAt: Date;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toSafeUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
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
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt,
  };
}

// ─── Auth Service ────────────────────────────────────────────────────────────

/**
 * Registers a new user. Sends OTP to email for verification.
 * Returns masked contact info — no sensitive data exposed.
 */
export async function registerUser(input: RegisterInput): Promise<{
  maskedEmail: string;
  maskedPhone: string;
}> {
  const { fullName, email, phone, password, role = UserRole.user } = input;

  // Check uniqueness
  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { phone } }),
  ]);

  if (existingEmail) throw new AppError('Email is already registered', 409);
  if (existingPhone) throw new AppError('Phone number is already registered', 409);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { fullName, email, phone, passwordHash, role },
  });

  logger.info('New user registered', { userId: user.id, role });

  // Generate and store OTP
  await createAndSendOTP(user.id, email, 'register');

  return {
    maskedEmail: maskEmail(email),
    maskedPhone: maskPhone(phone),
  };
}

/**
 * Verifies the OTP submitted during registration or login.
 * Marks user as verified and returns auth tokens.
 */
export async function verifyOTP(
  identifier: string,
  otp: string,
  purpose: 'register' | 'login' | 'reset' | 'verify'
): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      identifier,
      purpose,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord) throw new AppError('OTP not found or expired. Please request a new one.', 400);

  // Increment attempt count
  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { attempts: { increment: 1 } },
  });

  if (otpRecord.attempts >= otpRecord.maxAttempts) {
    throw new AppError('Maximum OTP attempts exceeded. Please request a new OTP.', 429);
  }

  // Constant-time OTP comparison via bcrypt
  const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
  if (!isValid) throw new AppError('Invalid OTP. Please try again.', 400);

  // Mark OTP as used
  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
    },
  });

  if (!user) throw new AppError('User not found', 404);

  // Mark user as verified on first registration
  if (purpose === 'register' && !user.isVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, isEmailVerified: true },
    });
  }

  const tokens = generateTokens(user);
  logger.info('OTP verified', { userId: user.id, purpose });

  return { user: toSafeUser({ ...user, isVerified: true }), tokens };
}

/**
 * Authenticates a user by email + password.
 * Sends a new OTP for 2-step verification (login OTP).
 */
export async function loginUser(input: LoginInput): Promise<{
  maskedEmail: string;
  requiresOTP: boolean;
}> {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) throw new AppError('Invalid email or password', 401);

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) throw new AppError('Invalid email or password', 401);

  if (!user.isVerified) {
    // Resend verification OTP
    await createAndSendOTP(user.id, email, 'register');
    throw new AppError('Email not verified. A new OTP has been sent.', 403);
  }

  // Send login OTP for 2FA
  await createAndSendOTP(user.id, email, 'login');

  return { maskedEmail: maskEmail(email), requiresOTP: true };
}

/**
 * Refreshes the access token using a valid refresh token.
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Verify the session exists and is active
  const tokenHash = await bcrypt.hash(refreshToken, 8);
  const session = await prisma.userSession.findFirst({
    where: { userId: payload.sub, isActive: true },
  });

  if (!session) throw new AppError('Session not found or revoked', 401);

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new AppError('User not found or inactive', 401);

  return generateTokens(user);
}

/**
 * Logs out the user by invalidating the session.
 */
export async function logoutUser(userId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false },
  });
  logger.info('User logged out', { userId });
}

/**
 * Resends OTP to an email or phone identifier.
 */
export async function resendOTP(
  identifier: string,
  purpose: 'register' | 'login' | 'reset' | 'verify'
): Promise<{ maskedEmail: string }> {
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { phone: identifier }] },
  });
  if (!user) throw new AppError('No account found with this contact', 404);

  await createAndSendOTP(user.id, user.email, purpose);
  return { maskedEmail: maskEmail(user.email) };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function createAndSendOTP(
  userId: string,
  email: string,
  purpose: 'register' | 'login' | 'reset' | 'verify'
): Promise<void> {
  // Invalidate any existing unused OTPs for same identifier + purpose
  await prisma.otpVerification.updateMany({
    where: { identifier: email, purpose, isUsed: false },
    data: { isUsed: true },
  });

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.otpVerification.create({
    data: {
      userId,
      identifier: email,
      otpHash,
      purpose,
      expiresAt: getOTPExpiry(10),
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  await sendOTPEmail({
    to: email,
    name: user?.fullName ?? 'User',
    otp,
    purpose,
  });
}

function generateTokens(user: { id: string; email: string; role: UserRole }): AuthTokens {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: 1 });
  return { accessToken, refreshToken };
}
