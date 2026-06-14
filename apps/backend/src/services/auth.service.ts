import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/error.middleware';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';
import { sendOtpEmail } from './email.service';

const weakMpins = new Set(['000000', '111111', '123456', '654321']);
const registrationOtpPurpose = 'registration';

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
  role?: UserRole;
  mpin?: string;
}

export interface VerifyOtpInput extends RegisterInput {
  otp: string;
}

export interface LoginInput {
  identifier: string;
  credential: string;
  loginMethod: 'password' | 'mpin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isVerified: boolean;
  mpinSet: boolean;
  mpinEnabled: boolean;
  profileImageUrl: string | null;
  createdAt: Date;
}

function toSafeUser(user: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isVerified: boolean;
  mpinHash: string | null;
  mpinEnabled: boolean;
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
    mpinEnabled: user.mpinEnabled,
    profileImageUrl: user.profileImageUrl,
    createdAt: user.createdAt,
  };
}

function validateOptionalMpin(mpin?: string): void {
  if (!mpin) return;
  if (!/^\d{6}$/.test(mpin)) {
    throw new AppError('MPIN must be exactly 6 digits', 400);
  }
  if (weakMpins.has(mpin)) {
    throw new AppError('MPIN is too simple. Please choose a less predictable combination.', 400);
  }
}

async function ensureUserDoesNotExist(email: string, phone: string, aadhaarNumber: string): Promise<void> {
  const [existingEmail, existingPhone, existingAadhaar] = await Promise.all([
    prisma.user.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { phone } }),
    prisma.user.findFirst({ where: { aadhaarNumber } }),
  ]);

  if (existingEmail) throw new AppError('Email is already registered', 409);
  if (existingPhone) throw new AppError('Phone number is already registered', 409);
  if (existingAadhaar) throw new AppError('Aadhaar number is already registered', 409);
}

async function createUserRecord(input: RegisterInput) {
  const { fullName, email, phone, aadhaarNumber, password, role = UserRole.user, mpin } = input;

  if (!(['user'] as string[]).includes(role)) {
    throw new AppError('Self-registration is only allowed for regular users', 403);
  }

  validateOptionalMpin(mpin);
  await ensureUserDoesNotExist(email, phone, aadhaarNumber);

  const passwordHash = await hashPassword(password);
  const mpinHash = mpin ? await bcrypt.hash(mpin, 12) : null;

  return prisma.user.create({
    data: {
      fullName,
      email,
      phone,
      aadhaarNumber,
      passwordHash,
      mpinHash,
      mpinEnabled: !!mpinHash,
      role,
      isVerified: true,
      isEmailVerified: true,
    },
  });
}

async function findUserByIdentifier(identifier: string) {
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    },
  });
}

async function loadActiveOtp(email: string) {
  return prisma.otpVerification.findFirst({
    where: {
      email,
      purpose: registrationOtpPurpose,
      verified: false,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function verifyOtpCode(email: string, otp: string) {
  const record = await loadActiveOtp(email);
  if (!record) {
    throw new AppError('OTP expired or not found. Please request a new one.', 400);
  }

  const isValid = await bcrypt.compare(otp, record.otpHash);
  if (!isValid) {
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    throw new AppError('Invalid OTP.', 400);
  }

  return record;
}

export async function sendRegistrationOtp(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [existingUser, recentOtpCount] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedEmail } }),
    prisma.otpVerification.count({
      where: {
        email: normalizedEmail,
        purpose: registrationOtpPurpose,
        createdAt: { gte: oneHourAgo },
      },
    }),
  ]);

  if (existingUser) throw new AppError('Email is already registered', 409);
  if (recentOtpCount >= 3) {
    throw new AppError('Too many OTP requests for this email. Please try again later.', 429);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpHash = await bcrypt.hash(otp, 10);

  await prisma.otpVerification.deleteMany({
    where: {
      email: normalizedEmail,
      purpose: registrationOtpPurpose,
      verified: false,
      isUsed: false,
    },
  });

  await prisma.otpVerification.create({
    data: {
      email: normalizedEmail,
      identifier: normalizedEmail,
      otpHash,
      purpose: registrationOtpPurpose,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verified: false,
      isUsed: false,
      attempts: 0,
      maxAttempts: 3,
    },
  });

  await sendOtpEmail(normalizedEmail, otp);
}

export async function checkRegistrationOtp(email: string, otp: string): Promise<void> {
  await verifyOtpCode(email.trim().toLowerCase(), otp.trim());
}

export async function verifyRegistrationOtp(input: VerifyOtpInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const otpRecord = await verifyOtpCode(normalizedEmail, input.otp.trim());

  const user = await createUserRecord({
    fullName: input.fullName,
    email: normalizedEmail,
    phone: input.phone,
    aadhaarNumber: input.aadhaarNumber,
    password: input.password,
    mpin: input.mpin,
    role: input.role,
  });

  await prisma.otpVerification.update({
    where: { id: otpRecord.id },
    data: {
      verified: true,
      isUsed: true,
    },
  });

  const tokens = generateTokens(user);
  await createSession(user.id, tokens.refreshToken);
  logger.info('New user registered via OTP verification', { userId: user.id });

  return { user: toSafeUser(user), tokens };
}

export async function registerUser(input: RegisterInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const user = await createUserRecord(input);
  const tokens = generateTokens(user);
  await createSession(user.id, tokens.refreshToken);
  logger.info('New user registered', { userId: user.id, role: user.role });
  return { user: toSafeUser(user), tokens };
}

export async function loginUser(input: LoginInput): Promise<{ user: SafeUser; tokens: AuthTokens }> {
  const { identifier, credential, loginMethod } = input;

  const user = await findUserByIdentifier(identifier.trim());
  if (!user || !user.isActive) throw new AppError('Invalid credentials.', 401);

  if (loginMethod === 'password') {
    const isPasswordValid = await comparePassword(credential, user.passwordHash);
    if (!isPasswordValid) throw new AppError('Invalid credentials.', 401);
  } else {
    if (!user.mpinEnabled || !user.mpinHash) {
      throw new AppError('MPIN login is not enabled for this account. Please use password login.', 403);
    }

    const isMpinValid = await bcrypt.compare(credential, user.mpinHash);
    if (!isMpinValid) throw new AppError('Invalid credentials.', 401);
  }

  const tokens = generateTokens(user);
  await createSession(user.id, tokens.refreshToken);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info('User logged in', { userId: user.id, loginMethod });
  return { user: toSafeUser(user), tokens };
}

export async function setupMpin(userId: string, mpin: string): Promise<void> {
  validateOptionalMpin(mpin);

  const mpinHash = await bcrypt.hash(mpin, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { mpinHash, mpinEnabled: true },
  });
  logger.info('MPIN set up', { userId });
}

export async function changeMpin(userId: string, currentMpin: string, newMpin: string): Promise<void> {
  validateOptionalMpin(newMpin);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AppError('User not found', 404);
  if (!user.mpinEnabled || !user.mpinHash) throw new AppError('MPIN is not enabled for this account.', 400);

  const isCurrentValid = await bcrypt.compare(currentMpin, user.mpinHash);
  if (!isCurrentValid) throw new AppError('Current MPIN is incorrect.', 401);

  const mpinHash = await bcrypt.hash(newMpin, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { mpinHash, mpinEnabled: true },
  });
  logger.info('MPIN changed', { userId });
}

export async function disableMpin(userId: string, currentMpin: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AppError('User not found', 404);
  if (!user.mpinEnabled || !user.mpinHash) throw new AppError('MPIN is not enabled for this account.', 400);

  const isCurrentValid = await bcrypt.compare(currentMpin, user.mpinHash);
  if (!isCurrentValid) throw new AppError('Current MPIN is incorrect.', 401);

  await prisma.user.update({
    where: { id: userId },
    data: { mpinHash: null, mpinEnabled: false },
  });
  logger.info('MPIN disabled', { userId });
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
