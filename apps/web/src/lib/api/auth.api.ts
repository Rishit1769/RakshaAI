import { api } from './fetcher';

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
  mpinEnabled?: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

export interface SendOtpPayload {
  email: string;
}

export interface CheckOtpPayload {
  email: string;
  otp: string;
}

export interface RegisterVerifyOtpPayload {
  email: string;
  otp: string;
  fullName: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
  mpin?: string;
}

export interface LegacyRegisterPayload extends Omit<RegisterVerifyOtpPayload, 'otp'> {
  role?: 'user';
}

export interface LoginPayload {
  identifier: string;
  credential: string;
  loginMethod: 'password' | 'mpin';
}

export interface SetupMpinPayload {
  mpin: string;
  confirmMpin: string;
}

export interface ChangeMpinPayload {
  currentMpin: string;
  newMpin: string;
  confirmMpin: string;
}

export interface DisableMpinPayload {
  currentMpin: string;
}

export const authApi = {
  sendRegistrationOtp: (payload: SendOtpPayload) =>
    api.post<null>('/auth/register/send-otp', payload),

  checkRegistrationOtp: (payload: CheckOtpPayload) =>
    api.post<null>('/auth/register/check-otp', payload),

  verifyRegistrationOtp: (payload: RegisterVerifyOtpPayload) =>
    api.post<AuthResponse>('/auth/register/verify-otp', payload),

  register: (payload: LegacyRegisterPayload) =>
    api.post<AuthResponse>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    api.post<AuthResponse>('/auth/login', payload),

  setupMpin: (payload: SetupMpinPayload) =>
    api.post<null>('/auth/mpin/setup', payload),

  changeMpin: (payload: ChangeMpinPayload) =>
    api.put<null>('/auth/mpin/change', payload),

  disableMpin: (payload: DisableMpinPayload) =>
    api.delete<null>('/auth/mpin/disable', { body: payload }),

  refreshToken: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  logout: () =>
    api.post<null>('/auth/logout'),

  getMe: () =>
    api.get<AuthUser>('/auth/me'),
};
