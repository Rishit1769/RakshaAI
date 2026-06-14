# RakshaAI

RakshaAI is a women safety and emergency assistance platform built as a monorepo. The core idea is simple: reduce the time between danger and assistance. The codebase combines a Next.js web frontend, an Express + TypeScript backend, Prisma/PostgreSQL data storage, Socket.IO real-time updates, and safety-focused workflows such as SOS activation, responder coordination, AI assistance, emergency contacts, and community reporting.

This README is intentionally written as an onboarding and handoff document for both humans and AI agents. It is meant to answer:

- What this product is trying to do
- Which apps and services exist
- How the main emergency flows work
- Where important logic lives
- How to run and modify the system safely
- What assumptions and caveats matter before making changes

## Product Intent

RakshaAI is not a generic CRUD app with a safety theme. It is an emergency workflow platform. The most important product invariant is:

`SOS creation must succeed fast, and non-critical side effects must never block the alert.`

That principle drives many implementation choices:

- SOS requests are lightweight and prioritized
- Real-time broadcasting happens immediately
- Secondary work like email notifications is fire-and-forget
- Location is captured from the client when possible, but the SOS still goes through if GPS is unavailable
- The backend records as much audit context as possible without delaying the user-facing confirmation

The current repository primarily exposes a web experience, but the schema and architectural docs are broader and include support for:

- End users
- Volunteers
- Police responders
- Admins
- Organizations and workers
- Community safety reporting
- Journey monitoring
- AI-driven risk and emergency assistance
- A mobile client direction via Flutter

## Monorepo Structure

```text
.
├── apps
│   ├── backend          Express + TypeScript API server
│   ├── web              Next.js App Router frontend
│   └── mobile           Flutter mobile scaffold
├── packages
│   └── shared-types     Shared package area for cross-app types
├── prisma               Root Prisma schema and migrations
├── database             Supplemental DB docs and seeds
├── docker               Local container setup
├── Docs                 Extra project docs
├── AppFlow.txt          High-level product flow document
├── BackendSchema.txt    Rich schema specification and rationale
├── Implementation.txt   Implementation planning notes
├── PRD.txt              Product requirements
├── TRD.txt              Technical requirements / constraints
└── README.md            This file
```

## Runtime Architecture

At runtime, the system is split into a few clear layers:

### 1. Web frontend

- Built with Next.js 14 App Router
- Uses React, TypeScript, Zustand, React Query, and native `fetch`
- Handles authentication state in the browser
- Calls the backend via `NEXT_PUBLIC_API_URL`
- Connects to Socket.IO for live alert updates

### 2. Backend API

- Built with Express, TypeScript, Prisma, and Socket.IO
- Exposes REST endpoints under `/api`
- Handles auth, SOS creation, emergency contacts, volunteers, police, incidents, community reports, maps, AI, and organizations
- Uses Zod-based request validation on many endpoints

### 3. Database

- PostgreSQL via Prisma
- Root schema at `prisma/schema.prisma`
- Schema is intentionally broad and covers much more than the currently surfaced UI

### 4. Real-time channel

- Socket.IO server initialized in `apps/backend/src/sockets/index.ts`
- Used for alert lifecycle events and location streaming

### 5. Email layer

- Nodemailer-based SMTP transport
- Used for OTP delivery and SOS emergency contact notifications
- Configured through environment variables

## Workspace Apps

## `apps/backend`

Purpose:

- Main application API
- Real-time event server
- Business logic for safety workflows

Key entrypoints:

- `src/server.ts`: bootstraps DB, Express, HTTP server, Socket.IO, graceful shutdown
- `src/app.ts`: middleware stack, CORS, compression, request parsing, API mounting
- `src/routes/index.ts`: top-level route registry

Important folders:

- `src/controllers`: thin request handlers
- `src/services`: main business logic
- `src/routes`: Express route definitions
- `src/validators`: Zod schemas
- `src/config`: env, DB, logger, mailer
- `src/sockets`: Socket.IO setup and event emitters
- `src/middleware`: auth, validation, rate limiting, errors, auditing

## `apps/web`

Purpose:

- End-user and responder-facing frontend
- Main current UI surface of the project

Key app areas under `apps/web/src/app`:

- `/`: landing page
- `/auth`: login, registration, OTP, MPIN setup
- `/dashboard`: main user dashboard
- `/sos`: SOS trigger screen
- `/dashboard/sos-active`: active SOS state screen
- `/dashboard/emergency-contacts`: manage emergency contacts
- `/dashboard/settings`: account and preferences
- `/community`: community safety feed
- `/community/report`: submit a report
- `/map`: map and safety overlays
- `/journey`: journey mode
- `/ai`: AI assistant page
- `/volunteer/register`, `/volunteer/dashboard`: volunteer flows
- `/police/register`, `/police/dashboard`: police flows
- `/dashboard/admin`: admin dashboard

Important frontend infra:

- `src/lib/api/fetcher.ts`: central API wrapper with token injection and refresh handling
- `src/store/auth.store.ts`: Zustand auth/session store
- `src/hooks/useSocket.ts`: authenticated socket lifecycle
- `src/hooks/useSosRealtime.ts`: alert-specific real-time subscriptions

## `apps/mobile`

Purpose:

- Flutter client scaffold for future or parallel mobile development

Current state:

- Basic app bootstrapping exists
- Core routing/theme structure exists
- This repository currently appears much more actively developed on the web/backend side than on the Flutter side

AI agents should treat mobile as present but likely incomplete relative to the backend and web product surface.

## Core Product Flows

The most important flows in this codebase are safety flows. The implementation is easier to understand if you reason from those first rather than from file structure.

## 1. Authentication flow

High-level sequence:

1. User registers with identity fields
2. OTP email is sent
3. OTP is verified
4. User account becomes usable
5. Login returns access credentials
6. Frontend stores auth state in Zustand and an access token in browser storage
7. API wrapper adds `Authorization: Bearer <token>` on subsequent calls
8. Refresh uses an HttpOnly cookie based endpoint

Relevant backend areas:

- `apps/backend/src/routes/auth.routes.ts`
- `apps/backend/src/services/auth.service.ts`
- `apps/backend/src/services/email.service.ts`

Relevant frontend areas:

- `apps/web/src/app/auth/*`
- `apps/web/src/store/auth.store.ts`
- `apps/web/src/lib/api/fetcher.ts`

## 2. SOS flow

This is the highest priority workflow in the project.

Current high-level sequence:

1. User opens `/sos`
2. Frontend attempts to obtain live geolocation
3. User selects an emergency type and optionally adds a description
4. Frontend refreshes location immediately before sending the SOS request
5. Backend validates the request
6. Backend resolves location using:
   - live client GPS if provided
   - last known `UserLocation` from the database if GPS is missing
   - no location at all if neither exists
7. Backend creates an SOS alert row
8. Backend persists a location breadcrumb when coordinates exist
9. Backend emits real-time SOS events
10. Backend asynchronously notifies emergency contacts by email
11. User receives immediate SOS confirmation without waiting for email delivery

Files that define the current SOS flow:

- `apps/web/src/app/sos/page.tsx`
- `apps/web/src/lib/api/sos.api.ts`
- `apps/backend/src/routes/sos.routes.ts`
- `apps/backend/src/controllers/sos.controller.ts`
- `apps/backend/src/validators/sos.validator.ts`
- `apps/backend/src/services/sos.service.ts`
- `apps/backend/src/services/emailService.ts`

Key design rules:

- Do not block SOS confirmation on email sending
- Do not require GPS in order to create an SOS
- Prefer client-provided live coordinates over inferred server-side location
- Preserve enough location and alert data for audit/history

### Current SOS API contract

`POST /api/sos`

Accepted payload shape:

```json
{
  "triggerMethod": "tap",
  "alertType": "general_danger",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracy": 15.0
  },
  "description": "Optional emergency context"
}
```

Location behavior:

- `location` is optional
- If the client omits it, the backend falls back to the user’s last known location from `user_locations`
- If no location is available at all, the SOS still succeeds and notifications say `Location unavailable`

### SOS email notification behavior

The email notification system:

- Uses Nodemailer with SMTP
- Sends alerts to all emergency contacts with emails
- Sends in parallel using `Promise.all`
- Logs per-contact delivery success or failure
- Never throws failures back into the main SOS request flow

Email content includes:

- User full name
- User phone number
- SOS trigger time in IST
- Coordinates when available
- Clickable Google Maps link
- Accuracy radius when available
- Optional Google Static Maps preview when `GOOGLE_MAPS_API_KEY` is set

## 3. Real-time location and alert updates

Socket.IO is a first-class part of the architecture.

Server responsibilities:

- Authenticates sockets with JWT when present
- Joins authenticated users to personal rooms
- Allows joining alert rooms
- Accepts `SEND_LOCATION`
- Persists incoming location points to `user_locations`
- Broadcasts alert and location updates to interested clients

Important server events:

- `SOS_CREATED`
- `LOCATION_UPDATE`
- `VOLUNTEER_ACCEPTED`
- `POLICE_ACCEPTED`
- `ALERT_RESOLVED`
- `ALERT_STATUS_CHANGED`

Important files:

- `apps/backend/src/sockets/index.ts`
- `apps/web/src/hooks/useSocket.ts`
- `apps/web/src/hooks/useSosRealtime.ts`
- `apps/web/src/lib/socket.ts`

## 4. Volunteer and police response

The repository models the idea that SOS is not only a user notification flow. It is also a responder coordination flow.

Volunteer flow:

- Users can register as volunteers
- Volunteers can set availability
- Volunteers can see nearby active alerts
- Volunteers can accept alerts

Police flow:

- Police accounts can register
- Officers can toggle duty status
- Police can view the emergency feed
- Police can self-assign or escalate alerts

Relevant backend services:

- `apps/backend/src/services/volunteer.service.ts`
- `apps/backend/src/services/police.service.ts`

Relevant frontend pages:

- `apps/web/src/app/volunteer/register/page.tsx`
- `apps/web/src/app/volunteer/dashboard/page.tsx`
- `apps/web/src/app/police/register/page.tsx`
- `apps/web/src/app/police/dashboard/page.tsx`

## 5. Community reporting flow

The platform also has a preventive/community layer, not only crisis response.

The community system supports:

- Posting safety incidents/reports
- Upvotes and comments
- Feed/discovery
- Hotspot style safety intelligence

Relevant backend:

- `apps/backend/src/routes/community.routes.ts`
- `apps/backend/src/services/community.service.ts`
- `apps/backend/src/routes/hotspot.routes.ts`

Relevant frontend:

- `apps/web/src/app/community/page.tsx`
- `apps/web/src/app/community/report/page.tsx`

## 6. AI assistance and risk analysis

The repository includes Gemini-backed AI services for safety-related analysis and assistant behavior.

Current AI responsibilities in code include:

- Emergency classification
- Safety assistant chat
- Location-aware or incident-aware risk context

Relevant backend:

- `apps/backend/src/routes/ai.routes.ts`
- `apps/backend/src/services/ai.service.ts`

Relevant frontend:

- `apps/web/src/app/ai/page.tsx`

## Database Mental Model

The Prisma schema is broad and should be read as a platform schema, not just a schema for the currently visible UI.

Most important model families:

### Identity and user profile

- `User`
- `UserSafetyProfile`
- `UserSession`
- `OtpVerification`

### Emergency and response

- `SosAlert`
- `AlertStatusHistory`
- `AlertNotification`
- `EmergencyEvidence`
- `GpsEvidenceLog`

### Location and journeys

- `UserLocation`
- `Journey`
- `Geofence`
- `GuardianTrackingSession`

### Responders and institutions

- `Volunteer`
- `VolunteerAvailability`
- `PoliceAccount`
- `PoliceStation`
- `Organization`
- `Worker`

### Community and intelligence

- `CommunityReport`
- `ReportUpvote`
- `ReportComment`
- `SafetyHotspot`
- `AiRiskAnalysis`
- `AiRouteRecommendation`

AI agents should assume that:

- `prisma/schema.prisma` is the source of truth for current generated models
- `BackendSchema.txt` contains broader design intent and rationale
- Not every schema concept is fully surfaced in the current web UI

## API Surface Overview

Top-level backend routes are registered in `apps/backend/src/routes/index.ts`.

Currently mounted route groups:

- `/api/health`
- `/api/auth`
- `/api/sos`
- `/api/maps`
- `/api/volunteers`
- `/api/police`
- `/api/ai`
- `/api/community`
- `/api/organizations`
- `/api/app`
- `/api/incidents`
- `/api/emergency-contacts`
- `/api/hotspots`

When orienting to a feature, the fastest path is usually:

1. Find the route file
2. Open the controller
3. Open the corresponding service
4. Check the validator
5. Check the frontend API wrapper/page calling it

## Environment Variables

There are two environment contexts that matter in practice:

### Root `.env`

Used for workspace-level and Docker-oriented settings.

### `apps/backend/.env` or `apps/backend/.env.local`

Preferred for backend secrets and local backend runs.

The backend env loader checks several locations in deterministic order and prefers backend-local env files when present.

Important current variables from `.env.example`:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_SECURE`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- `GOOGLE_MAPS_API_KEY`
- `POLICE_ALERT_EMAIL`
- `GEMINI_API_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`
- `CORS_ORIGIN`

Backward compatibility note:

- The backend still tolerates old `SMTP_*` variables as fallback aliases for email config
- New work should prefer `EMAIL_*`

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL
- Optional Docker for local infrastructure

### Install

```bash
npm install
```

### Run web + backend together

```bash
npm run dev
```

### Run backend only

```bash
npm run dev:backend
```

### Run web only

```bash
npm run dev:web
```

### Build

```bash
npm run build
```

### Prisma

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

Backend workspace equivalents are defined in `apps/backend/package.json`.

## Important Development Conventions

These are the practical repo conventions an AI should follow before editing:

### 1. The backend is service-centric

Controllers are intentionally thin. Business logic usually belongs in `src/services`.

### 2. Validation is explicit

Request body assumptions should generally be enforced in `src/validators`.

### 3. The Prisma schema lives at the repo root

Even backend scripts reference `../../prisma/schema.prisma`. Do not assume there is a backend-local schema.

### 4. Safety flows should degrade gracefully

Examples:

- Missing location should not break SOS
- One failed email should not cancel all email attempts
- Notification failures should not fail emergency creation

### 5. Real-time flows are part of the product, not an afterthought

If you change alert state semantics, check both:

- REST paths
- Socket emitters and listeners

### 6. Frontend auth is hybrid

- Access token is stored client-side for API calls
- Refresh uses cookie-based recovery

Any auth change should consider both browser state and refresh behavior.

## Current Project State and Caveats

These are important context points for future contributors and AI agents:

### The schema is larger than the visible web product

Many tables and models exist for planned or partial capabilities.

### The mobile app is present but not the primary active surface

Do not assume feature parity between mobile and web.

### Some docs are richer than the implementation

Files like `AppFlow.txt`, `BackendSchema.txt`, `Implementation.txt`, `PRD.txt`, and `TRD.txt` describe the intended platform in more detail than the currently shipped UI.

### Windows + Prisma file locks can happen

On this machine, `prisma generate` may fail if another process holds the Prisma query engine DLL open. If that happens:

- stop running backend/dev processes
- retry generation
- do not assume the schema change is invalid purely because generation failed once

### Some files contain old encoding artifacts

You may see odd characters in older comments or copied content. Prefer clean ASCII when editing unless Unicode is required.

## Recommended Reading Order for a New AI

If another AI is dropped into this repo cold, this is the fastest useful orientation sequence:

1. Read this `README.md`
2. Read `package.json` at the repo root
3. Read `apps/backend/src/server.ts`
4. Read `apps/backend/src/app.ts`
5. Read `apps/backend/src/routes/index.ts`
6. Read `prisma/schema.prisma`
7. Read `apps/web/src/app/page.tsx`
8. Read `apps/web/src/lib/api/fetcher.ts`
9. Read the feature-specific route/controller/service/page you need

For deeper product context:

1. `AppFlow.txt`
2. `BackendSchema.txt`
3. `Implementation.txt`
4. `PRD.txt`
5. `TRD.txt`

## If You Are Modifying SOS

Before changing SOS behavior, check all of these together:

- `apps/web/src/app/sos/page.tsx`
- `apps/web/src/lib/api/sos.api.ts`
- `apps/backend/src/routes/sos.routes.ts`
- `apps/backend/src/controllers/sos.controller.ts`
- `apps/backend/src/validators/sos.validator.ts`
- `apps/backend/src/services/sos.service.ts`
- `apps/backend/src/services/emailService.ts`
- `apps/backend/src/sockets/index.ts`
- `prisma/schema.prisma`

Questions to ask before shipping a change:

- Does the SOS still succeed if external integrations fail?
- Does the frontend still send the freshest possible location?
- Does the backend still fall back safely if location is missing?
- Are socket subscribers still receiving the right updates?
- Is the alert persisted in a way that supports audit/history?

## Verification

The current repo has successfully built with:

```bash
npm run build --workspace=apps/backend
npm run build --workspace=apps/web
```

If you change Prisma models:

1. run `npm run db:generate`
2. if generation fails on Windows due to file locks, stop running Node/Prisma processes and retry
3. then run the backend build again

## Final Summary

The shortest correct mental model of this repository is:

RakshaAI is a safety-first, emergency-oriented platform where the backend owns the critical workflows, the web app is the main active client, Prisma models a larger long-term ecosystem than the current UI exposes, and the SOS flow is the center of gravity for nearly every important architectural decision.
