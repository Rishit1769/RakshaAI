import { z } from 'zod';

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
});

export const verifyOTPSchema = z.object({
  identifier: z.string({ required_error: 'Email or phone is required' }).trim().min(5, 'Invalid identifier'),
  otp: z
    .string({ required_error: 'OTP is required' })
    .trim()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
  purpose: z.enum(['register', 'login', 'reset', 'verify', 'mpin']),
});

export const loginSchema = z.object({
  credential: z.string({ required_error: 'Email or phone is required' }).trim().min(1, 'Credential is required'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const mpinLoginSchema = z.object({
  mpin: z.string({ required_error: 'MPIN is required' }).trim().regex(/^\d{4,6}$/, 'MPIN must be 4 or 6 digits'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  credential: z.string().trim().optional(),
});

export const setupMpinSchema = z
  .object({
    mpin: z.string({ required_error: 'MPIN is required' }).trim().regex(/^\d{4,6}$/, 'MPIN must be 4 or 6 digits'),
    confirmMpin: z.string({ required_error: 'Please confirm your MPIN' }).trim(),
  })
  .refine((data) => data.mpin === data.confirmMpin, {
    message: 'MPINs do not match',
    path: ['confirmMpin'],
  });

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

export const resendOTPSchema = z.object({
  identifier: z.string({ required_error: 'Email or phone is required' }).trim().min(5, 'Invalid identifier'),
  purpose: z.enum(['register', 'login', 'reset', 'verify', 'mpin']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyOTPInput = z.infer<typeof verifyOTPSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MpinLoginInput = z.infer<typeof mpinLoginSchema>;
export type SetupMpinInput = z.infer<typeof setupMpinSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ResendOTPInput = z.infer<typeof resendOTPSchema>;
