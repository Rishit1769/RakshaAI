import { api } from './fetcher';

// ─── Types ────────────────────────────────────────────────────────

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
}

export interface VerifyOtpPayload {
  identifier: string;
  otp: string;
  purpose: 'register' | 'login' | 'reset' | 'verify' | 'mpin';
}

export interface LoginPayload {
  credential: string;
  password: string;
  loginType: 'email' | 'mpin';
}

export interface LoginMpinPayload {
  credential: string;
  password: string;
  mpin: string;
}

export interface SetupMpinPayload {
  mpin: string;
  confirmMpin: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface ResendOtpPayload {
  identifier: string;
  purpose: 'register' | 'login' | 'reset' | 'verify' | 'mpin';
}

// ─── API calls ────────────────────────────────────────────────────

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<{ maskedEmail: string; maskedPhone: string }>('/auth/register', payload),

  verifyOtp: (payload: VerifyOtpPayload) =>
    api.post<{ user: AuthUser; accessToken: string }>('/auth/verify-otp', payload),

  login: (payload: LoginPayload) =>
    api.post<{ maskedEmail: string; requiresOTP: boolean }>('/auth/login', payload),

  loginMpin: (payload: LoginMpinPayload) =>
    api.post<{ user: AuthUser; accessToken: string }>('/auth/login-mpin', payload),

  setupMpin: (payload: SetupMpinPayload) =>
    api.post<null>('/auth/setup-mpin', payload),

  refreshToken: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  logout: () =>
    api.post<null>('/auth/logout'),

  resendOtp: (payload: ResendOtpPayload) =>
    api.post<{ maskedEmail: string }>('/auth/resend-otp', payload),

  getMe: () =>
    api.get<AuthUser>('/auth/me'),
};
