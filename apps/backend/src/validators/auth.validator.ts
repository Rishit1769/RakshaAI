import { z } from 'zod';

const weakMpins = new Set(['000000', '111111', '123456', '654321']);

const mpinField = z
  .string({ required_error: 'MPIN is required' })
  .trim()
  .regex(/^\d{6}$/, 'MPIN must be exactly 6 digits')
  .refine((value) => !weakMpins.has(value), 'MPIN is too simple. Please choose a less predictable combination.');

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name may only contain letters, spaces, hyphens and apostrophes'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please provide a valid email address')
    .max(150, 'Email must not exceed 150 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Please provide a valid Indian phone number'),
  aadhaarNumber: z
    .string({ required_error: 'Aadhaar number is required' })
    .trim()
    .regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['user']).optional().default('user'),
  mpin: mpinField.optional(),
});

export const sendOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Please provide a valid email address'),
});

export const checkOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Please provide a valid email address'),
  otp: z.string({ required_error: 'OTP is required' }).trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

export const verifyOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Please provide a valid email address'),
  otp: z.string({ required_error: 'OTP is required' }).trim().regex(/^\d{6}$/, 'OTP must be exactly 6 digits'),
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name may only contain letters, spaces, hyphens and apostrophes'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Please provide a valid Indian phone number'),
  aadhaarNumber: z
    .string({ required_error: 'Aadhaar number is required' })
    .trim()
    .regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  mpin: mpinField.optional(),
});

export const loginSchema = z.object({
  identifier: z.string({ required_error: 'Identifier is required' }).trim().min(1, 'Identifier is required'),
  credential: z.string({ required_error: 'Credential is required' }).min(1, 'Credential is required'),
  loginMethod: z.enum(['password', 'mpin']),
});

export const setupMpinSchema = z
  .object({
    mpin: mpinField,
    confirmMpin: z.string({ required_error: 'Please confirm your MPIN' }).trim(),
  })
  .refine((data) => data.mpin === data.confirmMpin, {
    message: 'MPINs do not match',
    path: ['confirmMpin'],
  });

export const changeMpinSchema = z
  .object({
    currentMpin: z.string({ required_error: 'Current MPIN is required' }).trim().regex(/^\d{6}$/, 'Current MPIN must be exactly 6 digits'),
    newMpin: mpinField,
    confirmMpin: z.string({ required_error: 'Please confirm your MPIN' }).trim(),
  })
  .refine((data) => data.newMpin === data.confirmMpin, {
    message: 'MPINs do not match',
    path: ['confirmMpin'],
  });

export const disableMpinSchema = z.object({
  currentMpin: z.string({ required_error: 'Current MPIN is required' }).trim().regex(/^\d{6}$/, 'Current MPIN must be exactly 6 digits'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type SendOtpBody = z.infer<typeof sendOtpSchema>;
export type CheckOtpBody = z.infer<typeof checkOtpSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SetupMpinInput = z.infer<typeof setupMpinSchema>;
export type ChangeMpinInput = z.infer<typeof changeMpinSchema>;
export type DisableMpinInput = z.infer<typeof disableMpinSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
