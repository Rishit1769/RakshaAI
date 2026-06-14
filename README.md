# RakshaAI

RakshaAI is a women safety and emergency assistance platform with a Next.js web app, a Node/Express backend, and Prisma-backed PostgreSQL services.

## What Changed

### Theme toggle and dark mode
- Reworked theme handling into a shared client-side `ThemeProvider` so every toggle stays in sync.
- Theme changes now update the `<html>` element, set `data-theme`, and persist the choice in `localStorage` under `rakshaai-theme`.
- Added `suppressHydrationWarning` on the root layout to avoid theme flicker and hydration mismatch noise.
- Updated the landing page and key dashboards so light mode and dark mode both have intentional backgrounds, readable text, and smoother transitions.

### React Query Devtools
- React Query Devtools now load only in development.
- The floating production/preview trigger is no longer rendered outside `NODE_ENV=development`.

### UI and UX polish
- Added reusable loading helpers in `apps/web/src/components/ui/LoadingState.tsx`.
- Improved spacing, responsive layout, hover states, and panel styling on the home, dashboard, community, map, volunteer, and police screens.
- Replaced abrupt loading text with cleaner loading cards/spinners and better empty states where data is fetched.

### Database env loading fix
- The backend now resolves env files in a deterministic order and prefers `apps/backend/.env` for local backend runs.
- This fixes the previous mismatch where backend startup could read the workspace root `.env` and attempt to connect to the wrong PostgreSQL instance.

## Database Troubleshooting Notes

I verified two separate local database issues:

1. The previous failure from the workspace root env was:
   `P1000 Authentication failed against database server at localhost`

2. The backend-local env currently points to `localhost:55432`, and nothing is listening on that port in this workspace right now.

### Recommended local setup
- Use `apps/backend/.env` for backend secrets and `DATABASE_URL`.
- Use the workspace root `.env` for Docker Compose and root-level web variables.
- If you use the provided Docker setup, the default PostgreSQL port in `docker/docker-compose.yml` is `5432`.

### To get the backend connected locally
1. Confirm which PostgreSQL instance you want to use.
2. Update `apps/backend/.env` so `DATABASE_URL` points to the active instance.
3. If you use Docker from this repo, start it and keep the port aligned with `5432` unless you intentionally remap it.
4. Restart the backend after changing env values.

## Verification
- `npm --prefix apps/backend run build`
- `npm --prefix apps/web run build`

Both builds completed successfully after the code changes.

## SOS Location Contract

The SOS API accepts an optional `location` object in the POST body:

```json
{
  "triggerMethod": "tap",
  "alertType": "general_danger",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracy": 15.0
  }
}
```

Frontend responsibility:
- Call `navigator.geolocation.getCurrentPosition()` immediately before the SOS request for the most accurate live coordinates.
- Include the `location` object in the SOS request body when permission is granted.
- If geolocation is denied or unavailable, still fire the SOS request without `location`.
- The backend will fall back to the user's last known DB location, and if none exists it will continue the SOS flow and mark location as unavailable in notifications.

## Modified Files
- `apps/backend/src/config/env.ts`
- `apps/web/src/app/community/page.tsx`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/map/page.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/police/dashboard/page.tsx`
- `apps/web/src/app/providers.tsx`
- `apps/web/src/app/volunteer/dashboard/page.tsx`
- `apps/web/src/components/ui/LoadingState.tsx`
- `apps/web/src/components/ui/ThemeToggle.tsx`
- `apps/web/src/hooks/useTheme.ts`
