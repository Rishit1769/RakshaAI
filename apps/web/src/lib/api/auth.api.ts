import { api } from './fetcher';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
}

export interface LoginPayload {
  credential: string;
  password: string;
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

export const authApi = {
  register: (payload: RegisterPayload) =>
    api.post<{ user: AuthUser; accessToken: string }>('/auth/register', payload),

  login: (payload: LoginPayload) =>
    api.post<{ user: AuthUser; accessToken: string }>('/auth/login', payload),

  loginMpin: (payload: LoginMpinPayload) =>
    api.post<{ user: AuthUser; accessToken: string }>('/auth/login-mpin', payload),

  setupMpin: (payload: SetupMpinPayload) =>
    api.post<null>('/auth/setup-mpin', payload),

  refreshToken: (refreshToken: string) =>
    api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  logout: () =>
    api.post<null>('/auth/logout'),

  getMe: () =>
    api.get<AuthUser>('/auth/me'),
};
