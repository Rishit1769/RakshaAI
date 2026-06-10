import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const envCandidates = [
  path.resolve(process.cwd(), 'apps/backend/.env.local'),
  path.resolve(process.cwd(), 'apps/backend/.env'),
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env.local'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const requiredEnvVars: string[] = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '5000', 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL as string,

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // SMTP / Email
  SMTP_HOST: process.env.SMTP_HOST as string,
  SMTP_PORT: parseInt(process.env.SMTP_PORT ?? '587', 10),
  SMTP_USER: process.env.SMTP_USER as string,
  SMTP_PASS: process.env.SMTP_PASS as string,
  SMTP_FROM: process.env.SMTP_FROM ?? `RakshaAI <${process.env.SMTP_USER}>`,

  // MinIO
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? 'localhost',
  MINIO_PORT: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? '',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ?? '',
  MINIO_BUCKET_NAME: process.env.MINIO_BUCKET_NAME ?? '',
  MINIO_USE_SSL: (process.env.MINIO_USE_SSL ?? 'false').toLowerCase() === 'true',
  MINIO_APK_OBJECT_KEY: process.env.MINIO_APK_OBJECT_KEY ?? 'app/release.apk',

  // Gemini AI
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',

  // Firebase
  FIREBASE_SERVER_KEY: process.env.FIREBASE_SERVER_KEY ?? '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? '',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
} as const;
