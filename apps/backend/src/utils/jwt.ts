import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { mkdirSync } from 'fs';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

/**
 * Signs a short-lived access token (default: 15 minutes).
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Signs a long-lived refresh token (default: 7 days).
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Verifies and decodes an access token. Throws on invalid/expired.
 */
export function verifyAccessToken(token: string): AccessTokenPayload & { iat: number; exp: number } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload & {
    iat: number;
    exp: number;
  };
}

/**
 * Verifies and decodes a refresh token. Throws on invalid/expired.
 */
export function verifyRefreshToken(
  token: string
): RefreshTokenPayload & { iat: number; exp: number } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload & {
    iat: number;
    exp: number;
  };
}
