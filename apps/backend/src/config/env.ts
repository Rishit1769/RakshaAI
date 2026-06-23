import dotenv from 'dotenv';
import path from 'path';

const rootEnvFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
const rootEnvPath = path.resolve(__dirname, `../../../../${rootEnvFile}`);

dotenv.config({ path: rootEnvPath, override: false });

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
const jwtAccessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? process.env.JWT_EXPIRES_IN ?? '15m';
const jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

const requiredEnvVars: Array<[string, string | undefined]> = [
  ['DATABASE_URL', process.env.DATABASE_URL],
  ['JWT_ACCESS_SECRET or JWT_SECRET', jwtAccessSecret],
  ['JWT_REFRESH_SECRET', jwtRefreshSecret],
];

for (const [envVar, value] of requiredEnvVars) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '5000', 10),

  // Database
  DATABASE_URL: process.env.DATABASE_URL as string,

  // JWT
  JWT_ACCESS_SECRET: jwtAccessSecret as string,
  JWT_REFRESH_SECRET: jwtRefreshSecret as string,
  JWT_ACCESS_EXPIRES_IN: jwtAccessExpiresIn,
  JWT_REFRESH_EXPIRES_IN: jwtRefreshExpiresIn,

  // SMTP / Email
  EMAIL_HOST: process.env.EMAIL_HOST ?? process.env.SMTP_HOST ?? '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT ?? process.env.SMTP_PORT ?? '587', 10),
  EMAIL_SECURE: (process.env.EMAIL_SECURE ?? process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
  EMAIL_USER: process.env.EMAIL_USER ?? process.env.SMTP_USER ?? '',
  EMAIL_PASS: process.env.EMAIL_PASS ?? process.env.SMTP_PASS ?? '',
  EMAIL_FROM:
    process.env.EMAIL_FROM ??
    process.env.SMTP_FROM ??
    `Raksha AI <${process.env.EMAIL_USER ?? process.env.SMTP_USER ?? 'noreply@rakshaai.app'}>`,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',

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
  POLICE_ALERT_EMAIL: process.env.POLICE_ALERT_EMAIL ?? '',
  FRONTEND_URL: process.env.FRONTEND_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001',

  // CORS
  CORS_ORIGIN:
    process.env.CORS_ORIGIN ??
    process.env.FRONTEND_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3001',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
  RED_ZONE_ALERT_RADIUS_KM: parseFloat(process.env.RED_ZONE_ALERT_RADIUS_KM ?? '5'),
} as const;
