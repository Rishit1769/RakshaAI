# Environment Variables

RakshaAI environment variable reference for the current repository state.

Source of truth:
- `.env.example`
- `apps/backend/src/config/env.ts`
- `docker/docker-compose.yml`
- `apps/web/Dockerfile`

Related docs:
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [Implementation.md](Implementation.md)

## 1. Overview

Environment variables are loaded by the backend from several locations, in this order:

1. `apps/backend/.env.local`
2. `apps/backend/.env`
3. root `.env.local`
4. root `.env`
5. repo-relative fallback paths used by the backend config loader

Only a few values are strictly required at startup:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Do not commit secret values to the repository.

## 2. Variable Reference

| Variable | Required | Default | Description | Example Value |
|---|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime mode | `production` |
| `PORT` | No | `5000` | Backend port | `5000` |
| `DATABASE_URL` | Yes | none | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/app_db` |
| `JWT_ACCESS_SECRET` | Yes | none | Access token signing secret | long random secret |
| `JWT_REFRESH_SECRET` | Yes | none | Refresh token signing secret | different long random secret |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime | `7d` |
| `EMAIL_HOST` | No | none | SMTP host | `smtp.gmail.com` |
| `EMAIL_PORT` | No | `587` | SMTP port | `587` |
| `EMAIL_SECURE` | No | `false` | SMTP TLS toggle | `true` |
| `EMAIL_USER` | No | none | SMTP username | `noreply@example.com` |
| `EMAIL_PASS` | No | none | SMTP password | app password |
| `EMAIL_FROM` | No | derived | Email sender line | `Raksha AI <noreply@example.com>` |
| `SMTP_HOST` | No | alias | Alternative SMTP host var | `smtp.gmail.com` |
| `SMTP_PORT` | No | alias | Alternative SMTP port var | `587` |
| `SMTP_SECURE` | No | alias | Alternative SMTP secure var | `false` |
| `SMTP_USER` | No | alias | Alternative SMTP username | `noreply@example.com` |
| `SMTP_PASS` | No | alias | Alternative SMTP password | app password |
| `SMTP_FROM` | No | alias | Alternative SMTP from var | `noreply@example.com` |
| `POLICE_ALERT_EMAIL` | No | empty | Email target for police notifications | `alerts@example.com` |
| `GOOGLE_MAPS_API_KEY` | No | empty | Maps API key | browser or server key |
| `RED_ZONE_ALERT_RADIUS_KM` | No | `5` | Default red zone radius | `5` |
| `MINIO_ENDPOINT` | No | `localhost` | Object storage host | `minio.local` |
| `MINIO_PORT` | No | `9000` | Object storage port | `9000` |
| `MINIO_ACCESS_KEY` | No | empty | Object storage access key | secret value |
| `MINIO_SECRET_KEY` | No | empty | Object storage secret key | secret value |
| `MINIO_BUCKET_NAME` | No | empty | Bucket name | `rakshaai-assets` |
| `MINIO_USE_SSL` | No | `false` | TLS toggle for storage | `true` |
| `MINIO_APK_OBJECT_KEY` | No | `app/release.apk` | APK object path | `app/release.apk` |
| `GEMINI_API_KEY` | No | empty | Gemini API credential | secret value |
| `FIREBASE_SERVER_KEY` | No | empty | Reserved push-notification key | secret value |
| `FIREBASE_PROJECT_ID` | No | empty | Reserved Firebase project ID | `rakshaai-prod` |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend origin | `https://rakshaai.example.com` |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed browser origins | comma-separated origins |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Global rate-limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Global request cap | `100` |
| `NEXT_PUBLIC_API_URL` | Yes for web | none | Public backend URL for the browser | `http://localhost:5000/api` |
| `NEXT_PUBLIC_WS_URL` | No | derived | Public Socket.IO URL | `http://localhost:5000` |

## 3. Environment-Specific Behavior

| Environment | Differences |
|---|---|
| Development | Local env files, relaxed secure cookies, local database, direct `npm run dev` |
| Production | Secure cookies, TLS required, Docker or process-managed Node start, external SMTP/storage |
| Test | Use isolated database and test-safe secrets, if/when tests are added |

## 4. Secret Generation Guide

Recommended approach:

```bash
openssl rand -hex 32
```

Use different values for:

- access token secret
- refresh token secret
- storage secret
- SMTP password

## 5. Example `.env`

```dotenv
NODE_ENV=development
PORT=5000

DATABASE_URL=postgresql://postgres:password@localhost:5432/app_db

JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@example.com
EMAIL_PASS=app-password
EMAIL_FROM="Raksha AI <noreply@example.com>"

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=rakshaai-assets
MINIO_USE_SSL=false
MINIO_APK_OBJECT_KEY=app/release.apk

GEMINI_API_KEY=
FIREBASE_SERVER_KEY=
FIREBASE_PROJECT_ID=

FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_WS_URL=
NEXT_PUBLIC_SOCKET_URL=
```

## 6. Validation

The backend performs startup checks for required env vars in `apps/backend/src/config/env.ts`.

For production web builds, set `NEXT_PUBLIC_*` before `npm --workspace=apps/web run build`. Next.js bakes these values into the client bundle at build time, so a PM2 restart alone will not update browser API targets.

If you extend configuration, prefer to:

- add a required-var guard for truly mandatory values
- supply a safe default only when the app can operate without the variable
- document the new variable in this file and in `docs/DEPLOYMENT.md`
