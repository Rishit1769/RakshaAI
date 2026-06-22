# Implementation Reference

RakshaAI implementation handbook for the current codebase.

Source of truth:
- [`apps/backend/src/`](../apps/backend/src)
- [`apps/web/src/`](../apps/web/src)
- [`apps/mobile/lib/`](../apps/mobile/lib)
- [`prisma/schema.prisma`](../prisma/schema.prisma)
- [`prisma/migrations/`](../prisma/migrations)
- [`prisma/seed.ts`](../prisma/seed.ts)
- [`scripts/`](../scripts)
- [`README.md`](../README.md)

Related docs:
- [`AppFlow.md`](AppFlow.md)
- [`BackendSchema.md`](BackendSchema.md)
- [`API.md`](API.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`DEPLOYMENT.md`](DEPLOYMENT.md)
- [`ENVIRONMENT.md`](ENVIRONMENT.md)
- [`GLOSSARY.md`](GLOSSARY.md)
- [`RUNBOOK.md`](RUNBOOK.md)
- [`TESTING.md`](TESTING.md)
- [`UIUX.md`](UIUX.md)

## 1. Technology Stack Reference

| Technology | Version / Constraint | Role | Where Used | Configuration Location | Docs |
|---|---|---|---|---|---|
| Node.js | `>=18.0.0` | Runtime for backend and workspace scripts | `apps/backend`, `scripts`, root package scripts | `package.json`, `apps/backend/package.json` | https://nodejs.org/docs/latest/api/ |
| TypeScript | `5.4.5` | Shared language for backend and web | `apps/backend/src`, `apps/web/src` | `tsconfig.base.json`, workspace `tsconfig.json` files | https://www.typescriptlang.org/docs/ |
| Express | `4.19.2` | HTTP API server | `apps/backend/src/app.ts`, routers, controllers, middleware | `apps/backend/src/app.ts` | https://expressjs.com/ |
| Prisma ORM | `5.12.0` | Database ORM and migration tool | `prisma/schema.prisma`, `apps/backend/src/lib/prisma.ts` | `prisma/schema.prisma`, `apps/backend/package.json` | https://www.prisma.io/docs |
| PostgreSQL | 15+ implied | Primary relational database | All persisted application data | `DATABASE_URL`, `prisma/schema.prisma` | https://www.postgresql.org/docs/ |
| PostGIS | extension | Geospatial queries | `apps/backend/src/services/maps.service.ts`, `community.service.ts` | Prisma datasource extensions and DB extensions | https://postgis.net/documentation/ |
| Socket.IO | `4.7.5` | Real-time alert and location transport | `apps/backend/src/sockets`, `apps/web/src/lib/socket.ts` | `NEXT_PUBLIC_WS_URL`, `CORS_ORIGIN` | https://socket.io/docs/v4/ |
| JWT | `jsonwebtoken 9.0.2` | Access and refresh tokens | `apps/backend/src/utils/jwt.ts`, auth middleware | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, expiry vars | https://github.com/auth0/node-jsonwebtoken |
| bcryptjs | `2.4.3` | Password, MPIN, and refresh-token hashing | `apps/backend/src/utils/password.ts`, `auth.service.ts` | None beyond env secrets | https://github.com/dcodeIO/bcrypt.js/ |
| Nodemailer | `6.9.13` | SMTP email delivery | `apps/backend/src/config/mailer.ts`, `services/email*.ts` | `EMAIL_*` or `SMTP_*` env vars | https://nodemailer.com/about/ |
| MinIO client | `8.0.7` | Object storage access for app download | `apps/backend/src/services/app-download.service.ts` | `MINIO_*` env vars | https://docs.min.io/docs/javascript-client-api-reference.html |
| Google Generative AI | `0.24.1` | Gemini-based assistant and risk analysis | `apps/backend/src/services/ai.service.ts` | `GEMINI_API_KEY` | https://ai.google.dev/gemini-api/docs |
| Winston | `3.13.0` | Structured logging | `apps/backend/src/config/logger.ts` | `logs/` output, `NODE_ENV` | https://github.com/winstonjs/winston |
| Zod | `3.23.0` | Request validation | `apps/backend/src/validators/*`, `zodValidate.middleware.ts` | Route definitions | https://zod.dev/ |
| express-validator | `7.0.1` | Legacy request validation helper | `apps/backend/src/middleware/validate.middleware.ts` | Route definitions that still use it | https://express-validator.github.io/docs/ |
| Next.js | `14.2.3` | Web app router and rendering framework | `apps/web/src/app`, `apps/web/src/components` | `apps/web/package.json`, `apps/web/next.config.js` | https://nextjs.org/docs |
| React | `18.3.1` | Web UI runtime | `apps/web/src/app`, components, hooks | `apps/web/src/app/providers.tsx` | https://react.dev/ |
| React Query | `5.32.1` | Client caching and mutations | `apps/web/src/app/*`, `providers.tsx` | `apps/web/src/app/providers.tsx` | https://tanstack.com/query/latest |
| Zustand | `4.5.2` | Client auth/session state | `apps/web/src/store/auth.store.ts` | LocalStorage persistence | https://zustand.docs.pmnd.rs/ |
| Framer Motion | `12.40.0` | Animation on marketing/auth surfaces | `apps/web/src/components/layout/*`, `apps/web/src/app/page.tsx` | Component props | https://www.framer.com/motion/ |
| Leaflet | `1.9.4` | Map rendering | `apps/web/src/components/SafetyMap.tsx`, `apps/web/src/app/map/page.tsx` | Browser-only dynamic import | https://leafletjs.com/reference.html |
| Flutter | `>=3.19.0` / Dart `>=3.3.0` | Mobile app scaffold | `apps/mobile/lib` | `apps/mobile/pubspec.yaml` | https://docs.flutter.dev/ |
| Riverpod | `2.5.1` | Mobile state management | `apps/mobile/lib` | `pubspec.yaml` | https://riverpod.dev/ |
| go_router | `13.2.0` | Mobile navigation | `apps/mobile/lib` | `pubspec.yaml` | https://pub.dev/packages/go_router |
| dio | `5.4.3+1` | Mobile HTTP client | `apps/mobile/lib` | `pubspec.yaml` | https://pub.dev/packages/dio |
| Firebase Messaging | `15.0.4` | Push notification integration | Mobile scaffold | `pubspec.yaml`, `FIREBASE_*` env vars | https://firebase.google.com/docs/cloud-messaging |
| Zustand + localStorage | n/a | Browser auth persistence | `apps/web/src/store/auth.store.ts` | Browser storage key `rakshaai-auth` | https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage |

Design summary:
- Backend is an Express API with route/controller/service separation.
- Web is a Next.js App Router front end that talks to the backend via a thin fetch wrapper.
- Mobile is scaffolded in Flutter with Riverpod and Firebase dependencies, but the current repo focus is the backend/web pair.
- There are no top-level `server/` or `actions/` directories in the current repo; the server implementation lives under `apps/backend/src`, and there are currently no Next.js server actions.

## 2. Project Structure Deep Dive

### Annotated Source Tree

```text
rakshaai/
  apps/
    backend/
      src/
        app.ts
        server.ts
        config/
        controllers/
        middleware/
        routes/
        services/
        sockets/
        utils/
        validators/
        types/
      prisma/
      package.json
      Dockerfile
    web/
      src/
        app/
        components/
        hooks/
        lib/
        store/
      package.json
      next.config.js
      Dockerfile
    mobile/
      lib/
      pubspec.yaml
  prisma/
    schema.prisma
    migrations/
    seed.ts
  scripts/
    setup.sh
    setup.ps1
    setup-local-db.ps1
    seed.js
  docs/
    AppFlow.md
    BackendSchema.md
    Implementation.md
  database/
  docker/
  packages/
  logs/
  README.md
  PRD.md
  TRD.md
  UIUX.md
  package.json
```

### Directory Rules

`apps/backend/src`
- Purpose: API server, business logic, database access, sockets, validation, and third-party integrations.
- Naming: `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.validator.ts`, `*.middleware.ts`.
- Boundary: should not contain React code or browser-only APIs.

`apps/web/src`
- Purpose: Next.js UI, client-side state, API client wrappers, hooks, and reusable components.
- Naming: feature pages live in `app/`, reusable UI in `components/`, cross-cutting browser logic in `hooks/` and `lib/`.
- Boundary: should not talk to the database directly.

`apps/mobile/lib`
- Purpose: Flutter app shell, router, theme, and mobile-specific state/integration.
- Boundary: currently light scaffolding rather than a fully implemented feature surface.

`prisma`
- Purpose: schema, migrations, and seed data.
- Boundary: the only place where model definitions should live.

`scripts`
- Purpose: setup and legacy seeding helpers for local/dev bootstrap.
- Boundary: script-level orchestration only.

`docs`
- Purpose: canonical human-readable implementation and flow references.
- Boundary: documentation only, no executable app code.

### Import Conventions

- Backend path aliases are configured in `apps/backend/tsconfig.json` for `@/`, `@config/*`, `@controllers/*`, `@middleware/*`, `@routes/*`, `@services/*`, `@sockets/*`, `@utils/*`, and `@validators/*`.
- Web path aliases are configured in `apps/web/tsconfig.json` for `@/`, `@components/*`, `@lib/*`, `@store/*`, `@hooks/*`, and `@types/*`.
- Backend code tends to import via relative paths inside feature folders and aliases for cross-cutting code.
- Web code typically imports shared UI and state from aliases and uses `next/navigation` for routing.

## 3. Authentication Implementation

### Strategy

- Authentication is JWT-based, with a short-lived access token and a long-lived refresh token.
- Access tokens are sent in the `Authorization: Bearer <token>` header.
- Refresh tokens are stored in an HttpOnly cookie named `refreshToken`.
- Sessions are persisted in `UserSession` and hashed server-side.

### Token Structure

Access token payload:
- `sub`: user id
- `email`: user email
- `role`: Prisma `UserRole`

Refresh token payload:
- `sub`: user id
- `tokenVersion`: numeric marker currently set to `1`

Sign/verify helpers:
- `apps/backend/src/utils/jwt.ts`

### Session Management

- New sessions are created on registration, OTP registration completion, login, and refresh rotation.
- `UserSession.tokenHash` stores a bcrypt hash of the refresh token.
- `refreshTokens()` in `auth.service.ts` finds the matching active session by comparing the raw refresh token against stored hashes.
- Refresh rotates the session:
  - current session is marked inactive
  - a new session row is created
  - a new refresh cookie and access token are issued
- Logout deactivates all active sessions for that user.

### Token Storage

- Web client stores the access token in localStorage under `access_token`.
- The refresh token is never placed in localStorage; it lives in the HttpOnly cookie.
- `apps/web/src/lib/api/fetcher.ts` injects the access token into every request.
- On 401, the fetch wrapper attempts a single refresh using `/auth/refresh`.

### Middleware Enforcement

- `authenticate` validates the bearer access token, loads the current user from the database, checks `isActive`, and populates `req.user`.
- `authorize(...roles)` enforces role membership.
- Role-specific helpers include `requireSuperAdmin`, `requirePoliceDepartment`, `requireNgo`, `requirePoliceman`, `requireVolunteer`, `requireDepartment`, and `requireDepartmentOrAdmin`.
- `app.ts` mounts rate limiting before routes, and 404/error handlers after routes.

### Role Extraction

- The role is read from the access token and then revalidated against the database user record.
- The request context used by controllers is the database-backed `req.user`, not the raw JWT payload.

### Protected Route Patterns

- Web pages use `useProtectedRoute()` to redirect unauthenticated users to `/auth/login`.
- `mustChangePassword` forces a redirect to `/dashboard/settings`.
- `useRoleGuard(expectedRole)` adds a stricter role check for pages that must match a single role.
- `AuthBootstrap` hydrates persisted state by calling `authApi.getMe()` before the app considers the session ready.

### Adding a New Protected Route

1. Add the backend route under an authenticated router.
2. Apply the narrowest authorization middleware that matches the business rule.
3. Return the standard JSON envelope via `sendSuccess`, `sendCreated`, or `sendError`.
4. Add a matching web API wrapper in `apps/web/src/lib/api/`.
5. Protect the page with `useProtectedRoute()` or `useRoleGuard()`.

## 4. Authorization and RBAC Implementation

### Roles in Use

- Canonical app roles currently used by routing and middleware: `SUPERADMIN`, `POLICE_DEPARTMENT`, `POLICEMAN`, `NGO`, `VOLUNTEER`.
- Legacy/compatibility values still present in the enum and middleware: `user`, `department`, `volunteer`, `police`, `admin`, `guardian`, `super_admin`, `organization_admin`, `worker`.

### Permission Model

- RBAC is mostly route-level, not permission-flag based.
- Permissions are checked by:
  - middleware on the backend
  - role-aware dashboard navigation on the web
  - per-page guards in React hooks
- Some features also check object ownership in services, such as SOS ownership, hotspot assignment, or department membership.

### Where Checks Happen

- Middleware:
  - `authenticate`
  - `authorize`
  - role-specific helpers
- Services:
  - object ownership checks
  - organization ownership checks
  - alert assignment checks
- Components/pages:
  - `useProtectedRoute`
  - `useRoleGuard`
  - dashboard navigation selection

### Adding a New Role

1. Add the value to `prisma/schema.prisma` if the role must be persisted.
2. Update any route guards and dashboard navigation switches.
3. Update seed data if the role needs a bootstrap user.
4. Update web auth routing and any server-side role checks.
5. Re-run Prisma generate and any needed migrations.

### Adding a New Permission Check

1. Put the check closest to the data access point.
2. Prefer middleware for request-wide access control.
3. Prefer service-level ownership checks for object-specific rules.
4. Keep client-side guards as UX improvements only, not as the security boundary.

## 5. Server Actions Reference

There are currently no Next.js server actions in the repo.

- No `actions/` directory exists.
- No `use server` directives were found.
- All mutations flow through backend API routes and client-side fetch wrappers.

Conventions to follow instead:
- Add the mutation to an Express controller and service.
- Expose it through a route.
- Add a typed wrapper in `apps/web/src/lib/api/`.
- Call it from a client component or hook.

## 6. API Routes Reference

### Common Response Envelope

- Success response shape: `{ success, message, data?, timestamp }`
- Error response shape: `{ success: false, message, error?, timestamp }`
- Validation errors return HTTP 422 and a field list.
- Auth failures return 401.
- Forbidden access returns 403.
- Not found returns 404.

### Auth Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/auth/register/send-otp` | Send registration OTP email | No | `{ email }` | `null` success envelope |
| POST | `/api/auth/register/check-otp` | Validate OTP without creating account | No | `{ email, otp }` | `null` success envelope |
| POST | `/api/auth/register/verify-otp` | Verify OTP and create account | No | `VerifyOtpInput` | `{ user, accessToken }` and refresh cookie |
| POST | `/api/auth/register` | Legacy direct registration | No | `RegisterInput` | `{ user, accessToken }` and refresh cookie |
| POST | `/api/auth/login` | Password or MPIN login | No | `{ identifier, credential, loginMethod }` | `{ user, accessToken }` and refresh cookie |
| POST | `/api/auth/login-mpin` | Legacy MPIN login path | No | `credential/password/mpin` body | `{ user, accessToken }` and refresh cookie |
| POST | `/api/auth/refresh` | Rotate refresh token | No, but token required | Cookie or `{ refreshToken }` | `{ accessToken }` and refreshed cookie |
| POST | `/api/auth/logout` | Invalidate sessions | Yes | None | `null` success envelope, cookie cleared |
| POST | `/api/auth/setup-mpin` | Enable MPIN | Yes | `{ mpin, confirmMpin }` | `null` |
| POST | `/api/auth/mpin/setup` | Alias for setup | Yes | `{ mpin, confirmMpin }` | `null` |
| PUT | `/api/auth/mpin/change` | Change MPIN | Yes | `{ currentMpin, newMpin, confirmMpin }` | `null` |
| DELETE | `/api/auth/mpin/disable` | Disable MPIN | Yes | `{ currentMpin }` | `null` |
| POST | `/api/auth/change-password` | Change password | Yes | `{ currentPassword, newPassword, confirmPassword }` | `null` |
| GET | `/api/auth/me` | Return session user profile | Yes | None | Current user profile |

### App Download

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/app/download` | Generate presigned MinIO APK URL | No | None | `{ url }` or 503 error |

### Community Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/community` | List community reports | No | Query: `category`, `page`, `limit` | `{ reports, pagination }` |
| GET | `/api/community/heatmap` | Return heatmap points | No | Query: `latitude`, `longitude`, `radius` | Array of points |
| POST | `/api/community` | Create a report | Yes | `createReportSchema` | Created report |
| POST | `/api/community/upvote` | Toggle upvote | Yes | `{ reportId }` | `{ upvoteCount, upvoted }` |
| POST | `/api/community/comments` | Add a comment | Yes | `{ reportId, content }` | Created comment |

### SOS Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/sos` | Create SOS alert | Yes | `createSosSchema` | Created alert |
| PATCH | `/api/sos/status` | Update alert status | Yes | `updateSosStatusSchema` | Updated alert |
| GET | `/api/sos/active` | List active alerts | Yes | None | Array of alerts |
| GET | `/api/sos/history` | Paginated alert history | Yes | Query: `page`, `limit` | `{ alerts, total, page, limit, totalPages }` |
| GET | `/api/sos/:id` | Load alert details | Yes | Param `id` | Alert detail |
| POST | `/api/sos/:id/cancel` | Cancel own alert | Yes | Param `id` | `null` |

### Maps Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/maps/nearby/volunteers` | Nearby volunteer lookup | Yes | Query: `latitude`, `longitude`, `radius` | Array of volunteers |
| GET | `/api/maps/nearby/police` | Nearby police stations | Yes | Query: `latitude`, `longitude`, `radius` | Array of stations |
| GET | `/api/maps/nearby/safe-zones` | Nearby safe zones | Yes | Query: `latitude`, `longitude`, `radius` | Array of zones |
| GET | `/api/maps/risk` | Area risk summary | Yes | Query: `latitude`, `longitude`, `radius` | Risk summary object |

### Emergency Contact Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/emergency-contacts` | List contacts | Yes | None | `{ contacts, count, maxContacts }` |
| POST | `/api/emergency-contacts` | Create contact | Yes | Contact payload | Contact |
| PUT | `/api/emergency-contacts/:id` | Update contact | Yes | Contact payload | Contact |
| DELETE | `/api/emergency-contacts/:id` | Delete contact | Yes | None | `null` |
| PATCH | `/api/emergency-contacts/:id/primary` | Make primary | Yes | None | Contact |

### Organization Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/organizations` | Create organization | Yes, super-admin/admin | Organization payload | Organization |
| GET | `/api/organizations` | List organizations | Yes, super-admin/admin/org admin | Query filters | Paginated list |
| GET | `/api/organizations/:id` | Organization detail | Yes, super-admin/admin/org admin | Param `id` | Organization detail |
| PATCH | `/api/organizations/:id/approve` | Approve organization | Yes, super-admin/admin | None | Organization |
| PATCH | `/api/organizations/:id/suspend` | Suspend organization | Yes, super-admin/admin | `{ reason? }` | Organization |
| POST | `/api/organizations/workers` | Create worker | Yes, organization admin | Worker payload | Worker |
| GET | `/api/organizations/:orgId/workers` | List workers | Yes, super-admin/admin/org admin | Param `orgId` | Worker list |
| PATCH | `/api/organizations/workers/:id/deactivate` | Deactivate worker | Yes, organization admin | None | Worker |

### Admin Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/admin/navigation-meta` | Dashboard meta | Yes, super-admin | None | Meta object |
| GET | `/api/admin/overview` | Superadmin overview | Yes, super-admin | None | Metrics object |
| GET | `/api/admin/users` | User management list | Yes, super-admin | Query `page`, `pageSize`, `role`, `status`, `search` | Paginated users |
| PATCH | `/api/admin/users/:id/role` | Update user role | Yes, super-admin | `{ role }` | Updated user |
| PATCH | `/api/admin/users/:id/suspend` | Suspend/reactivate user | Yes, super-admin | `{ isSuspended }` | Updated user |
| DELETE | `/api/admin/users/:id` | Delete user | Yes, super-admin | None | `null` |
| GET | `/api/admin/check-email` | Check if email exists | Yes, super-admin | Query `email` | `{ available }` |
| GET | `/api/admin/departments` | List departments | Yes, super-admin | None | Department list |
| POST | `/api/admin/departments` | Create department | Yes, super-admin | Department payload | Department |
| DELETE | `/api/admin/departments/:id` | Delete department | Yes, super-admin | None | `null` |
| GET | `/api/admin/ngos` | List NGOs | Yes, super-admin | None | NGO list |
| POST | `/api/admin/ngos` | Create NGO | Yes, super-admin | NGO payload | NGO |
| DELETE | `/api/admin/ngos/:id` | Delete NGO | Yes, super-admin | None | `null` |
| GET | `/api/admin/hotspots` | Hotspot list | Yes, super-admin | None | Hotspot list |
| GET | `/api/admin/hotspots/:id` | Hotspot detail | Yes, super-admin | Param `id` | Hotspot detail |
| PATCH | `/api/admin/hotspots/:id/status` | Update hotspot status | Yes, super-admin | `{ status }` | Hotspot |
| GET | `/api/admin/analytics/sos` | SOS analytics | Yes, super-admin | None | Analytics object |
| GET | `/api/admin/moderation/queue` | Moderation queue | Yes, super-admin | None | Queue items |
| POST | `/api/admin/moderation/:id/dismiss` | Dismiss moderation item | Yes, super-admin | `{ type }` | `null` |
| DELETE | `/api/admin/moderation/incident/:id` | Delete incident | Yes, super-admin | None | `null` |
| DELETE | `/api/admin/moderation/comment/:id` | Delete comment | Yes, super-admin | None | `null` |
| PATCH | `/api/admin/moderation/user/:id/ban` | Ban user | Yes, super-admin | None | `null` |
| GET | `/api/admin/audit-log` | Audit log | Yes, super-admin | Query `page`, `pageSize`, `action` | Paginated audit rows |

### Dashboard Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/dashboard/superadmin/overview` | Superadmin dashboard overview | Yes, super-admin | None | Metrics |
| GET | `/api/dashboard/superadmin/users` | Superadmin user list | Yes, super-admin | None | Users |
| PATCH | `/api/dashboard/superadmin/users/:id/status` | Toggle user active state | Yes, super-admin | `{ isActive }` | Updated user |
| GET | `/api/dashboard/superadmin/moderation` | Moderation queue | Yes, super-admin | None | Queue |
| GET | `/api/dashboard/superadmin/hotspots` | Hotspot oversight | Yes, super-admin | None | Hotspot list |
| GET | `/api/dashboard/superadmin/analytics` | Analytics | Yes, super-admin | None | Analytics |
| GET | `/api/dashboard/superadmin/audit` | Audit logs | Yes, super-admin | None | Audit rows |
| GET | `/api/dashboard/department/overview` | Department overview | Yes, police department | None | Overview object |
| GET | `/api/dashboard/department/assignments` | Department assignments | Yes, police department | None | Assignment object |
| GET | `/api/dashboard/department/activity` | Department activity | Yes, police department | None | Activity list |
| GET | `/api/dashboard/ngo/overview` | NGO overview | Yes, NGO | None | Overview object |
| GET | `/api/dashboard/ngo/response` | NGO response workspace | Yes, NGO | None | Response object |
| GET | `/api/dashboard/ngo/activity` | NGO activity | Yes, NGO | None | Activity list |
| GET | `/api/dashboard/policeman/overview` | Officer overview | Yes, policeman | None | Overview object |
| GET | `/api/dashboard/policeman/hotspot` | Officer hotspot | Yes, policeman | None | Hotspot object |
| POST | `/api/dashboard/policeman/report` | Submit official report | Yes, policeman | Official report schema | Created report |
| GET | `/api/dashboard/volunteer/overview` | Volunteer overview | Yes, volunteer | None | Overview object |
| GET | `/api/dashboard/volunteer/cases` | Volunteer cases | Yes, volunteer | None | Case list |
| POST | `/api/dashboard/volunteer/check-in` | Volunteer check-in | Yes, volunteer | Check-in schema | Created check-in |

### Department Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/department/navigation-meta` | Department nav metadata | Yes, police department | None | Meta object |
| GET | `/api/department/overview` | Department overview | Yes, police department | None | Metrics/map/activity |
| GET | `/api/department/policemen` | List policemen | Yes, police department | None | Policeman list |
| POST | `/api/department/policemen` | Create policeman | Yes, police department | Policeman schema | Created user |
| GET | `/api/department/policemen/:id` | Policeman detail | Yes, police department | Param `id` | Detail object |
| PATCH | `/api/department/policemen/:id/deactivate` | Deactivate policeman | Yes, police department | None | Updated user |
| PATCH | `/api/department/policemen/:id/reactivate` | Reactivate policeman | Yes, police department | None | Updated user |
| GET | `/api/department/hotspots` | Department hotspots | Yes, police department | None | Hotspot list |
| POST | `/api/department/hotspots` | Create hotspot | Yes, police department | Hotspot schema | Created hotspot |
| POST | `/api/department/hotspots/:id/assign` | Assign hotspot | Yes, police department | `{ policemanId }` | Updated hotspot |
| DELETE | `/api/department/hotspots/:id/assign` | Unassign hotspot | Yes, police department | None | Updated hotspot |
| PATCH | `/api/department/hotspots/:id` | Update hotspot | Yes, police department | Hotspot schema | Updated hotspot |
| DELETE | `/api/department/hotspots/:id` | Delete hotspot | Yes, police department | None | `null` |
| GET | `/api/department/incidents` | Department incidents | Yes, police department | None | Incident list |
| PATCH | `/api/department/incidents/:id/resolve` | Resolve incident | Yes, police department | `{ notes? }` | Updated incident |
| GET | `/api/department/sos` | Department SOS list | Yes, police department | Query `page`, `pageSize` | Paginated SOS list |
| PATCH | `/api/department/sos/:id/acknowledge` | Acknowledge SOS | Yes, police department | `{ officerId }` | Updated SOS |
| PATCH | `/api/department/sos/:id/resolve` | Resolve SOS | Yes, police department | None | Updated SOS |
| GET | `/api/department/zones` | Department zones | Yes, police department | None | Zone list |
| POST | `/api/department/zones` | Create zone | Yes, police department | Zone schema | Created zone |
| PATCH | `/api/department/zones/:id` | Update zone | Yes, police department | Zone schema | Updated zone |
| DELETE | `/api/department/zones/:id` | Delete zone | Yes, police department | None | `null` |
| GET | `/api/department/activity` | Department activity | Yes, police department | None | Activity list |

### NGO Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/ngo/navigation-meta` | NGO nav metadata | Yes, NGO | None | Meta object |
| GET | `/api/ngo/overview` | NGO overview | Yes, NGO | None | Overview object |
| GET | `/api/ngo/volunteers` | List volunteers | Yes, NGO | None | Volunteer list |
| POST | `/api/ngo/volunteers` | Create volunteer | Yes, NGO | Volunteer schema | Created user |
| GET | `/api/ngo/volunteers/:id` | Volunteer detail | Yes, NGO | Param `id` | Detail object |
| PATCH | `/api/ngo/volunteers/:id/deactivate` | Deactivate volunteer | Yes, NGO | None | Updated user |
| PATCH | `/api/ngo/volunteers/:id/reactivate` | Reactivate volunteer | Yes, NGO | None | Updated user |
| GET | `/api/ngo/incidents` | Open incidents | Yes, NGO | None | Incident list |
| GET | `/api/ngo/incidents/assigned` | Assigned incidents | Yes, NGO | None | Incident list |
| POST | `/api/ngo/incidents/:id/assign` | Assign incident | Yes, NGO | `{ volunteerId }` | Updated incident |
| DELETE | `/api/ngo/incidents/:id/assign` | Unassign incident | Yes, NGO | None | Updated incident |
| PATCH | `/api/ngo/incidents/:id/close` | Close incident | Yes, NGO | None | Updated incident |
| GET | `/api/ngo/sos` | NGO SOS feed | Yes, NGO | Query `page`, `pageSize` | SOS list |
| PATCH | `/api/ngo/sos/:id/respond` | Start NGO response | Yes, NGO | `{ volunteerId }` | Updated SOS |
| PATCH | `/api/ngo/sos/:id/close` | Close NGO response | Yes, NGO | None | Updated SOS |
| GET | `/api/ngo/zones` | Visible zones | Yes, NGO | None | Zone list |
| GET | `/api/ngo/activity` | NGO activity | Yes, NGO | None | Activity list |

### Officer Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/officer/navigation-meta` | Officer nav metadata | Yes, policeman | None | Meta object |
| GET | `/api/officer/overview` | Officer overview | Yes, policeman | None | Overview object |
| GET | `/api/officer/hotspot` | Officer hotspot | Yes, policeman | None | Hotspot object |
| GET | `/api/officer/sos` | Officer SOS feed | Yes, policeman | None | SOS list |
| PATCH | `/api/officer/sos/:id/acknowledge` | Acknowledge SOS | Yes, policeman | None | Updated SOS |
| PATCH | `/api/officer/sos/:id/resolve` | Resolve SOS | Yes, policeman | None | Updated SOS |
| GET | `/api/officer/incidents` | Nearby incidents | Yes, policeman | Query `radius`, `lat`, `lng` | Incident list |
| PATCH | `/api/officer/incidents/:id/resolve` | Resolve incident | Yes, policeman | None | Updated incident |
| POST | `/api/officer/incidents` | Create incident report | Yes, policeman | Officer report schema | Created incident |

### Volunteer Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/volunteers/register` | Public volunteer registration | Yes, but currently disabled in controller | Register schema | 403 error |
| GET | `/api/volunteers/profile` | Volunteer profile | Yes | None | Volunteer profile |
| PATCH | `/api/volunteers/availability` | Update availability | Yes, volunteer | `{ status }` | Updated volunteer |
| POST | `/api/volunteers/accept` | Accept alert | Yes, volunteer | `{ alertId }` | Updated alert |
| GET | `/api/volunteers/alerts` | Active alert feed | Yes, volunteer | None | Alert list |

### Volunteer Dashboard Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/volunteer/navigation-meta` | Volunteer dashboard metadata | Yes, volunteer | None | Meta object |
| GET | `/api/volunteer/overview` | Volunteer overview | Yes, volunteer | None | Overview object |
| GET | `/api/volunteer/sos` | Volunteer SOS feed | Yes, volunteer | None | SOS list |
| PATCH | `/api/volunteer/sos/:id/respond` | Mark responding | Yes, volunteer | Param `id` | Updated SOS |
| PATCH | `/api/volunteer/sos/:id/close` | Close response | Yes, volunteer | Param `id` | Updated SOS |
| GET | `/api/volunteer/cases` | Active cases | Yes, volunteer | None | Case list |
| GET | `/api/volunteer/cases/history` | Closed case history | Yes, volunteer | None | Case list |
| PATCH | `/api/volunteer/cases/:id/checkin` | Case check-in | Yes, volunteer | Check-in schema | Updated check-in |
| PATCH | `/api/volunteer/cases/:id/close` | Close case | Yes, volunteer | Param `id` | Updated case |
| GET | `/api/volunteer/incidents/map` | Incident map points | Yes, volunteer | Query `days` | Marker list |
| POST | `/api/volunteer/checkin` | Standalone check-in | Yes, volunteer | Check-in schema | Created check-in |
| GET | `/api/volunteer/checkin/history` | Check-in history | Yes, volunteer | None | History list |
| GET | `/api/volunteer/zones` | Visible zones | Yes, volunteer | None | Zone list |

### Police Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/police/register` | Create police account | Yes | Police schema | Created account |
| GET | `/api/police/profile` | Own profile | Yes | None | Profile |
| PATCH | `/api/police/duty` | Toggle on-duty state | Yes, policeman/super-admin | `{ isOnDuty }` | Updated profile |
| POST | `/api/police/assign` | Self-assign alert | Yes, policeman/super-admin | Assign schema | Updated alert |
| POST | `/api/police/escalate` | Escalate alert | Yes, policeman/super-admin | Escalation schema | Updated alert |
| GET | `/api/police/alerts` | Active/escalated alerts feed | Yes, policeman/super-admin | None | Alert list |

### AI Routes

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| POST | `/api/ai/classify` | Emergency classification | Yes | Classification schema | Classification result |
| POST | `/api/ai/risk-analysis` | Area risk analysis | Yes | Risk schema | Risk result |
| POST | `/api/ai/chat` | Safety assistant chat | Yes | `{ messages }` | `{ reply }` |

### Health Route

| Method | Path | Purpose | Auth | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/api/health` | Health check | No | None | Health payload |

### Route Implementation Notes

- `auth.routes.ts` is rate limited with `authRateLimiter`.
- `ai.routes.ts` is rate limited with `aiRateLimiter`.
- `maps.routes.ts` and the global `/api` mount also sit behind rate limiting.
- Most routes validate with Zod, then call a controller, then call a service.
- Controllers are intentionally thin and return the shared envelope helpers from `apps/backend/src/utils/response.ts`.

## 7. Database Access Patterns

### Prisma Initialization

- `apps/backend/src/lib/prisma.ts` creates a single PrismaClient instance.
- In development, the client is stored on `globalThis` to survive hot reloads.
- `apps/backend/src/config/database.ts` wraps connect/disconnect logging.

### Transactions

Transactions are used when multiple rows must change together, especially for:
- auth session rotation
- SOS status changes
- community upvote toggles
- volunteer acceptance and counters
- some dashboard/department workflows

### Query Style

- Standard reads use `findUnique`, `findFirst`, `findMany`, `count`, `update`, `create`, `delete`, and `upsert`.
- Pagination uses `skip` and `take` with computed page offsets.
- Sorting is typically by `createdAt desc`.
- Includes/selects are used to keep payloads shallow and reduce overfetching.

### Raw SQL

Raw SQL is used where Prisma is not the best fit:
- geospatial distance calculations in `maps.service.ts`
- heatmap/incident aggregation in `community.service.ts`
- a defensive audit middleware fallback that avoids breaking the API if the audit table is unavailable

### Error Handling

- Business-rule failures throw `AppError`.
- Prisma/service errors are translated to HTTP responses by `asyncHandler` plus the error middleware.
- Missing records usually become 404s; invalid ownership becomes 403s; invalid credentials become 401s.

### How to Add a New Query

1. Add or reuse the Prisma relation/index needed for the lookup.
2. Keep the service method as the only place that knows the query shape.
3. Select only the fields the controller or UI actually needs.
4. If the query will be used repeatedly, add an index before shipping it.

## 8. File Storage Implementation

### Current Provider

- MinIO is used only for mobile app download distribution.
- There is no generalized upload subsystem in the current codebase.

### Bucket and Object Layout

- Bucket name comes from `MINIO_BUCKET_NAME`.
- APK object key comes from `MINIO_APK_OBJECT_KEY`, defaulting to `app/release.apk`.
- The backend checks object existence before generating the download URL.

### Download Flow

1. The web UI calls `GET /api/app/download`.
2. The backend verifies MinIO configuration.
3. `statObject()` confirms the APK exists.
4. `presignedGetObject()` returns a URL valid for 60 seconds.
5. The web client creates an `<a>` tag and starts the download.

### Error Handling

- Misconfigured storage returns 503.
- The web button shows a temporary toast when the download fails.

### Notes

- There is no presigned upload flow.
- There is no file type validation layer for uploads because uploads are not implemented yet.

## 9. Email Queue Implementation

### Queue Model

- There is no persistent email queue or worker in the current implementation.
- Emails are sent synchronously through Nodemailer and then errors are logged.

### Email Entry Points

- `sendOtpEmail()` for registration OTPs
- `sendEmergencyEmail()` for emergency contact notifications
- `sendSOSAlert()` for SOS contact fan-out
- `sendWelcomeEmail()` for managed account onboarding
- `sendRedZoneAlertEmails()` for red-zone notifications
- `sendPoliceAlertEmail()` for high-density community incidents

### Retry Logic

- No queue-level retry exists.
- The send functions generally log failures and return, except OTP email, which throws a user-visible failure because registration depends on it.

### Failure Handling

- SOS and red-zone email failures are logged but do not block the core alert workflow.
- Police alert email failures are logged and suppressed.
- OTP email failures bubble up so registration can fail safely.

### Adding a New Email Type

1. Add a function in `apps/backend/src/services/email.service.ts` or `emailService.ts`.
2. Keep the HTML self-contained and concise.
3. Wrap the send in `try/catch`.
4. Decide whether failure should block the user flow or merely log a warning.

### Monitoring

- Email sends are observable through backend logs.
- There is no dedicated queue dashboard at present.

## 10. Background Jobs and Cron

### Current State

- There are no scheduled cron jobs or external background workers in the current repo.
- The app uses event-driven async work inside request handlers.

### Event-Driven Async Work

- SOS creation:
  - persists alert
  - writes user location if available
  - emits Socket.IO events
  - notifies emergency contacts by email
- Community report escalation:
  - updates score/pin color
  - may trigger a police alert email when a report turns red
- Red zone trigger:
  - finds nearby safe zones
  - persists the red zone
  - sends email notifications to affected departments
- Socket location updates:
  - persist live location rows
  - broadcast `LOCATION_UPDATE`

### Failure Behavior

- These tasks are usually fire-and-forget and logged on failure.
- The HTTP response is typically returned before slower side effects finish.

### Adding a New Background Job

If you need a real background worker, introduce one explicitly:
- add a persistent queue or scheduler
- move the side effect out of the request path
- make it idempotent
- add monitoring and retry policy

## 11. Component Architecture

### Web App Layout

- `apps/web/src/app/layout.tsx` sets global fonts, metadata, global CSS, and mounts providers plus the download button.
- `apps/web/src/app/providers.tsx` mounts React Query, auth bootstrap, and socket initialization.
- The app uses the Next.js App Router and leans heavily on client components for interactive surfaces.

### Component Organization

`components/layout`
- Shells and page scaffolding such as `DashboardLayout`, `AppShell`, `AuthSplitLayout`, `MarketingNav`, and `MarketingFooter`.

`components/ui`
- Reusable low-level UI primitives such as buttons, cards, inputs, loading states, empty states, filter pills, section headers, and charts.

`components/auth`
- Session bootstrap logic and auth-specific wiring.

`components/dashboard`
- Shared dashboard presentation primitives.

`components/SafetyMap.tsx`
- Feature-rich map component used by the map page, community reporting, and incident layers.

### Naming Conventions

- Shared primitives use lower-level descriptive names.
- Feature components are camel-cased and usually live next to the feature they serve.
- Pages are route-based and descriptive.

### State Management

- Global auth state uses Zustand.
- Data fetching uses React Query.
- Local form state stays in component state for clarity and minimal abstraction.

### Data Fetching Pattern

- Pages call `api.get/post/patch/put/delete` from `apps/web/src/lib/api/fetcher.ts`.
- The fetch wrapper injects the bearer token and auto-refreshes once on 401.
- Query invalidation is used after mutations to keep the UI responsive.

### Form Handling Pattern

- Forms are mostly controlled components with manual validation.
- Password and MPIN flows do client-side prevalidation before hitting the backend.
- The app avoids a form library in favor of explicit state and readable error messages.

### Adding a New Component

1. Decide whether it is shared UI or feature-specific.
2. Put low-level primitives in `components/ui`.
3. Put shell/layout logic in `components/layout`.
4. Keep API calls outside the component when possible.
5. Prefer simple local state unless the data must be shared globally.

## 12. Custom Hooks Reference

| Hook | Purpose | Inputs | Outputs | Typical Use |
|---|---|---|---|---|
| `useProtectedRoute` | Redirect unauthenticated users and enforce password-change redirect | None | `{ user, accessToken, isAuthenticated, isAuthReady }` | Protected pages |
| `useRoleGuard` | Enforce one exact role on a page | `expectedRole` | `useProtectedRoute` state plus `isAllowed` | Single-role dashboard pages |
| `useSocket` | Manage the Socket.IO client lifecycle | None | Socket ref | Mounted once in providers |
| `useSosRealtime` | Subscribe to live SOS updates for one alert | `alertId` | SOS realtime state | Active SOS page |
| `useLocationBroadcast` | Periodically send GPS coordinates during active SOS | `{ alertId, intervalMs? }` | void | Active SOS page |

### Hook Notes

- `useProtectedRoute` is a UX guard, not the security boundary.
- `useSocket` auto-joins the authenticated user room.
- `useSosRealtime` joins and leaves the alert room automatically.
- `useLocationBroadcast` silently ignores geolocation failures so panic flows are not blocked by browser permission issues.

## 13. Middleware Implementation

### Execution Order

`apps/backend/src/app.ts` applies middleware in this order:
1. `helmet`
2. `cors`
3. JSON and URL-encoded body parsers
4. `sanitizeBody`
5. `compression`
6. `morgan`
7. API rate limiter on `/api`
8. API router
9. 404 handler
10. error handler

### Middleware Catalog

| Middleware | Purpose | Notes |
|---|---|---|
| `authenticate` | Validate bearer access token and load current user | Populates `req.user` |
| `authorize` | Enforce one of a set of roles | Used for coarse RBAC |
| `requireSuperAdmin` | Superadmin-only shortcut | Used on admin routes |
| `requirePoliceDepartment` | Police department-only access | Used on department dashboard routes |
| `requireNgo` | NGO-only access | Used on NGO dashboard routes |
| `requirePoliceman` | Officer-only access | Used on officer routes |
| `requireVolunteer` | Volunteer-only access | Used on volunteer dashboard routes |
| `requireDepartment` | Legacy department access | Still present for backward compatibility |
| `requireDepartmentOrAdmin` | Department or admin access | Used for zone management |
| `validateBody` | Zod body validation | Replaces `req.body` with parsed output |
| `validateQuery` | Zod query validation | Parses and coerces query params |
| `validateParams` | Zod route-param validation | Ensures IDs are well-formed |
| `validate` | express-validator result handler | Legacy helper still available |
| `rateLimiter` | Global API throttle | Configurable via env |
| `authRateLimiter` | Auth endpoint throttle | 10 attempts / 15 min |
| `aiRateLimiter` | AI endpoint throttle | 10 requests / min |
| `auditLog` | Fire-and-forget audit insertion | Currently defensive and non-blocking |

### Adding New Middleware Logic

- Put security-sensitive checks before route handlers.
- Keep `authenticate` first whenever a route needs a user context.
- Use `validateBody` and friends before controllers to keep controllers thin.
- Keep logging middleware non-blocking unless the operation is explicitly supposed to fail on logging errors.

## 14. Environment Configuration

### Loading Rules

- `apps/backend/src/config/env.ts` loads `.env` candidates in a fallback chain.
- Required backend secrets:
  - `DATABASE_URL`
  - `JWT_ACCESS_SECRET`
  - `JWT_REFRESH_SECRET`

### Environment Reference

| Variable | Required | Purpose | Used By | Example / Default |
|---|---|---|---|---|
| `NODE_ENV` | Optional | Runtime mode | Backend, web, logger | `development` |
| `PORT` | Optional | Backend listen port | Backend | `5000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | Prisma | `postgresql://postgres:159753@localhost:5432/app_db` |
| `JWT_ACCESS_SECRET` | Yes | Access-token signing key | Auth, sockets | 64-byte hex secret |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token signing key | Auth | Different 64-byte hex secret |
| `JWT_ACCESS_EXPIRES_IN` | Optional | Access token lifetime | Auth | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Optional | Refresh token lifetime | Auth | `7d` |
| `EMAIL_HOST` | Optional | Primary SMTP host | Mailer | `smtp.gmail.com` |
| `EMAIL_PORT` | Optional | Primary SMTP port | Mailer | `465` |
| `EMAIL_SECURE` | Optional | Primary SMTP TLS flag | Mailer | `true` |
| `EMAIL_USER` | Optional | Primary SMTP username | Mailer | email address |
| `EMAIL_PASS` | Optional | Primary SMTP password | Mailer | app password |
| `EMAIL_FROM` | Optional | Sender display name/address | Mailer | `Raksha AI <you@example.com>` |
| `GOOGLE_MAPS_API_KEY` | Optional | Static map image URL generation | Email templates | empty |
| `RED_ZONE_ALERT_RADIUS_KM` | Optional | Red-zone proximity threshold | Red zone service | `5` |
| `SMTP_HOST` | Optional alias | Legacy SMTP host fallback | Mailer env fallback | `smtp.gmail.com` |
| `SMTP_PORT` | Optional alias | Legacy SMTP port fallback | Mailer env fallback | `587` |
| `SMTP_SECURE` | Optional alias | Legacy TLS flag fallback | Mailer env fallback | `false` |
| `SMTP_USER` | Optional alias | Legacy SMTP user fallback | Mailer env fallback | app email |
| `SMTP_PASS` | Optional alias | Legacy SMTP password fallback | Mailer env fallback | app password |
| `SMTP_FROM` | Optional alias | Legacy sender fallback | Mailer env fallback | sender string |
| `POLICE_ALERT_EMAIL` | Optional | Destination for red-density police emails | Community email service | empty |
| `MINIO_ENDPOINT` | Optional | MinIO host | App download service | `localhost` |
| `MINIO_PORT` | Optional | MinIO port | App download service | `9000` |
| `MINIO_ACCESS_KEY` | Optional | MinIO access key | App download service | empty |
| `MINIO_SECRET_KEY` | Optional | MinIO secret key | App download service | empty |
| `MINIO_BUCKET_NAME` | Optional | APK bucket name | App download service | empty |
| `MINIO_USE_SSL` | Optional | MinIO TLS flag | App download service | `false` |
| `MINIO_APK_OBJECT_KEY` | Optional | APK object path | App download service | `app/release.apk` |
| `GEMINI_API_KEY` | Optional | Gemini auth key | AI service | empty |
| `FIREBASE_SERVER_KEY` | Optional | Push notification legacy key | Mobile/backend integration | empty |
| `FIREBASE_PROJECT_ID` | Optional | Push notification project id | Mobile/backend integration | empty |
| `FRONTEND_URL` | Optional | Frontend origin / fallback | Backend CORS, links | `http://localhost:3000` |
| `CORS_ORIGIN` | Optional | Allowed browser origins | Backend CORS, socket origin | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Optional | Global throttle window | Backend rate limiter | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Optional | Global throttle ceiling | Backend rate limiter | `100` |
| `NEXT_PUBLIC_API_URL` | Optional | Browser API base URL | Web fetch wrapper | `/api` |
| `NEXT_PUBLIC_WS_URL` | Optional | Browser WebSocket base URL | Socket client | same-origin when unset |
| `NEXT_PUBLIC_SOCKET_URL` | Optional | Alias for browser WebSocket base URL | Socket client | same-origin when unset |
| `VITE_API_URL` | Legacy/unused | Old frontend API variable | Not currently used by the web app | `http://localhost:3000` |

### Service-to-Env Mapping

- Auth: JWT secrets and expirations.
- Email: `EMAIL_*` or `SMTP_*`.
- Storage: `MINIO_*`.
- AI: `GEMINI_API_KEY`.
- Map/email imagery: `GOOGLE_MAPS_API_KEY`.
- Web client: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, and `NEXT_PUBLIC_SOCKET_URL`.

## 15. Error Handling Patterns

### Backend

- Controllers are wrapped in `asyncHandler`, which forwards promise rejections to Express error middleware.
- Business errors use `AppError(message, statusCode)`.
- Unknown errors become HTTP 500 with a generic message.
- Validation failures return 422 with field-level information.
- `sendSuccess`, `sendCreated`, and `sendError` keep response shapes consistent.

### Auth and Session Errors

- Invalid or expired access token -> 401.
- Missing bearer token -> 401.
- Inactive account -> 401.
- Forbidden role -> 403.
- Refresh token failures -> 401 and client auth clear-out on the web side.

### Storage Errors

- MinIO misconfiguration or missing object -> 503 for the download endpoint.

### Email Errors

- OTP email failures throw so registration fails clearly.
- SOS, red-zone, and police alert email failures are logged but do not block the main transaction.

### Client-side Errors

- Web API wrapper throws `ApiError` when a JSON API response is non-OK.
- Fetch wrapper retries once on 401 via refresh.
- Pages usually show inline error banners and keep the rest of the UI responsive.
- `AuthBootstrap` clears stale auth state if the session cannot be restored.

### Logging

- Dev logs are verbose; production logs are warn/error focused and written to files under `logs/`.
- Socket, email, and AI failures are logged with feature-specific context.

### Empty States

- Lists and feeds typically render `EmptyState`, `LoadingState`, or equivalent card messaging.
- The map and SOS surfaces keep a useful fallback even when GPS is unavailable.

## 16. Testing Approach

### Current State

- No `*.test.ts`, `*.spec.ts`, `*.test.tsx`, or `*.spec.tsx` files were found in the repository scan.
- Jest is installed in both workspace tooling and backend dependencies, but there are currently no authored test suites in the repo.

### Commands

- Root: `npm test`
- Backend workspace: `npm --prefix apps/backend test`
- Web workspace: `npm --prefix apps/web test` if added later

### Recommended Additions

- Backend service tests for auth, SOS, community scoring, and organization flows.
- Route tests for 401/403/422/404 cases.
- Web component tests for auth pages and critical CTA flows.
- Smoke tests for the fetch wrapper refresh path.

## 17. Feature Implementation Guide

### 1. Add a Prisma Model

1. Define the table in `prisma/schema.prisma`.
2. Add relations, indexes, and referential actions deliberately.
3. Run a migration.
4. Update seed data if the new model needs bootstrap rows.

### 2. Create the Backend Service

1. Add a service under `apps/backend/src/services/`.
2. Keep business rules and database access there.
3. Use `AppError` for expected failures.
4. Prefer transactions when multiple rows must stay in sync.

### 3. Add the Controller and Route

1. Add controller methods that only parse the request and send the response.
2. Add route definitions with auth and validation middleware.
3. Keep response envelopes consistent.

### 4. Add the Web API Wrapper

1. Add the endpoint to a file in `apps/web/src/lib/api/`.
2. Use the shared `api` wrapper, not raw `fetch`, unless the flow is exceptional.
3. Model the response shape explicitly.

### 5. Build the Page or Component

1. Add a page under `apps/web/src/app/`.
2. Add `useProtectedRoute()` or `useRoleGuard()` if needed.
3. Use React Query for remote data and local state for form inputs.
4. Keep loading and empty states visible.

### 6. Wire Up Auth Checks

1. Backend: enforce security with middleware and service ownership checks.
2. Web: redirect on missing auth or wrong role.
3. Remember that client guards are not a substitute for backend authorization.

### 7. Update Documentation

- If the feature changes data shape, update [`BackendSchema.md`](BackendSchema.md).
- If the feature changes user flow, update [`AppFlow.md`](AppFlow.md).
- If the feature changes implementation conventions, update this file.

### Example End-to-End Feature Path

For a new "report a nearby hazard" capability:
- add a Prisma model or expand `CommunityReport`
- add a backend service method
- expose a route and validation schema
- add a web API wrapper
- create or update a page/component
- gate the page with auth and role checks
- add seed/test coverage if the feature is used in onboarding
