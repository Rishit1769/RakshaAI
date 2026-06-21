# API Reference

RakshaAI backend API reference for the current repository state.

Source of truth:
- `apps/backend/src/routes/`
- `apps/backend/src/controllers/`
- `apps/backend/src/services/`
- `apps/backend/src/middleware/`
- `apps/backend/src/utils/response.ts`

## 1. API Overview

| Item | Value |
|---|---|
| Base URL | `/api` |
| Versioning | No explicit version prefix in the current implementation |
| Transport | HTTPS in production; HTTP acceptable only in local development |
| Authentication | JWT access token in `Authorization: Bearer <token>` plus HttpOnly refresh-token cookie |
| Response envelope | `{ success, message, data?, error?, timestamp }` |
| Validation | Zod and route middleware on most mutating endpoints |
| CORS | Explicit origin allowlist from `CORS_ORIGIN` |
| Rate limiting | Global `/api` limiter, auth limiter, AI limiter |
| Content type | JSON for API requests and responses |

### Global Headers

| Header | Required | Notes |
|---|---|---|
| `Authorization` | For protected routes | Bearer access token |
| `Content-Type` | Usually | `application/json` |
| `Cookie` | For refresh flow | `refreshToken` cookie is HttpOnly |

### Standard Response Shape

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "timestamp": "2026-06-22T10:00:00.000Z"
}
```

Error responses use the same envelope with `success: false` and an `error` string when relevant.

## 2. Authentication Endpoints

Base path: `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register/send-otp` | No | Send OTP to email during registration |
| POST | `/register/check-otp` | No | Check OTP without finalizing account creation |
| POST | `/register/verify-otp` | No | Verify OTP and create a session |
| POST | `/register` | No | Final registration creation |
| POST | `/login` | No | Password login |
| POST | `/login-mpin` | No | MPIN login fallback |
| POST | `/refresh` | No | Refresh access token using cookie or body token |
| POST | `/logout` | Yes | Revoke current session |
| POST | `/setup-mpin` | Yes | Create an MPIN |
| PUT | `/mpin/change` | Yes | Change an MPIN |
| DELETE | `/mpin/disable` | Yes | Disable MPIN |
| POST | `/change-password` | Yes | Change password |
| GET | `/me` | Yes | Return current profile |

### `POST /api/auth/register/send-otp`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Description | Sends a registration OTP to the provided email |

Request body:

| Field | Type | Required | Notes |
|---|---|---|---|
| email | string | Yes | Must be a valid email address |

Success response:

```json
{ "success": true, "message": "OTP sent to your email address.", "data": null, "timestamp": "..." }
```

Common errors:

| Status | Meaning |
|---|---|
| 400 | Invalid email or request body |
| 429 | Too many auth attempts |

```bash
curl -X POST "$API_URL/api/auth/register/send-otp" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### `POST /api/auth/register/check-otp`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Description | Validates an OTP before profile completion |

Request body:

| Field | Type | Required |
|---|---|---|
| email | string | Yes |
| otp | string | Yes |

### `POST /api/auth/register/verify-otp`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Description | Verifies OTP and finalizes first-time account creation |

Request body includes the profile fields required by registration validation.

### `POST /api/auth/register`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Description | Creates a new user account and returns tokens |

### `POST /api/auth/login`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Description | Password-based login |

Request body:

| Field | Type | Required |
|---|---|---|
| identifier | string | Yes |
| credential | string | Yes |

### `POST /api/auth/login-mpin`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Description | MPIN-based login path |

### `POST /api/auth/refresh`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | No |
| Description | Exchanges refresh token for a new access token |

Request body:

| Field | Type | Required | Notes |
|---|---|---|---|
| refreshToken | string | No | Optional fallback if cookie is unavailable |

### `POST /api/auth/logout`

| Field | Value |
|---|---|
| Method | POST |
| Auth Required | Yes |
| Description | Revokes the current user session and clears the cookie |

### `GET /api/auth/me`

| Field | Value |
|---|---|
| Method | GET |
| Auth Required | Yes |
| Description | Returns the current user profile and role metadata |

## 3. Domain API Reference

### Health

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/health` | No | Any | Service health check |

```bash
curl "$API_URL/api/health"
```

### App Download

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/app/download` | No | Any | Returns a presigned APK download URL or redirect payload |

### SOS

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| POST | `/api/sos` | Yes | General users and authenticated responders where allowed | Create a new SOS alert |
| PATCH | `/api/sos/:id/cancel` | Yes | Alert owner or authorized role | Cancel an active alert |
| GET | `/api/sos/active` | Yes | Alert owner | Retrieve the current active SOS state |
| GET | `/api/sos/:id` | Yes | Authorized participants | Retrieve SOS detail |
| GET | `/api/sos/:id/timeline` | Yes | Authorized participants | Retrieve alert history |

```bash
curl -X POST "$API_URL/api/sos" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alertType":"harassment","description":"Need help","latitude":19.076,"longitude":72.8777}'
```

### Maps

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/maps/nearby/volunteers` | No | Any | Nearby volunteer locations |
| GET | `/api/maps/nearby/police` | No | Any | Nearby police locations |
| GET | `/api/maps/nearby/safe-zones` | No | Any | Nearby safe zones |
| GET | `/api/maps/risk` | No | Any | Area risk summary |

### Community

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/community` | No | Any | List community reports |
| GET | `/api/community/heatmap` | No | Any | Heatmap summary |
| POST | `/api/community` | Yes | Authenticated users | Create community report |
| POST | `/api/community/:id/like` | Yes | Authenticated users | Like a report |
| POST | `/api/community/:id/comments` | Yes | Authenticated users | Comment on a report |

### Incidents

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/incidents` | No | Any | List incidents |
| POST | `/api/incidents/:id/like` | Yes | Authenticated users | Like an incident |
| POST | `/api/incidents/:id/comments` | Yes | Authenticated users | Comment on an incident |

### Emergency Contacts

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/emergency-contacts` | Yes | Owner | List contacts |
| POST | `/api/emergency-contacts` | Yes | Owner | Create contact |
| PUT | `/api/emergency-contacts/:id` | Yes | Owner | Update contact |
| DELETE | `/api/emergency-contacts/:id` | Yes | Owner | Delete contact |
| PATCH | `/api/emergency-contacts/:id/primary` | Yes | Owner | Set primary contact |

### AI

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| POST | `/api/ai/classify` | No | Any | Classify emergency input |
| POST | `/api/ai/risk-analysis` | No | Any | Risk analysis request |
| POST | `/api/ai/chat` | Yes | Authenticated users | Chat assistant |

### Organizations

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| POST | `/api/organizations` | Yes | Superadmin/admin | Create organization |
| GET | `/api/organizations` | Yes | Superadmin/admin/organization admin | List organizations |
| GET | `/api/organizations/:id` | Yes | Superadmin/admin/organization admin | Organization detail |
| PATCH | `/api/organizations/:id/approve` | Yes | Superadmin/admin | Approve organization |
| PATCH | `/api/organizations/:id/suspend` | Yes | Superadmin/admin | Suspend organization |
| POST | `/api/organizations/workers` | Yes | Organization admin | Create worker |
| GET | `/api/organizations/:orgId/workers` | Yes | Superadmin/admin/organization admin | List workers |
| PATCH | `/api/organizations/workers/:id/deactivate` | Yes | Organization admin | Deactivate worker |

### Admin

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/admin/navigation-meta` | Yes | Superadmin | Notification counts |
| GET | `/api/admin/overview` | Yes | Superadmin | Overview metrics |
| GET | `/api/admin/users` | Yes | Superadmin | User list |
| PATCH | `/api/admin/users/:id/role` | Yes | Superadmin | Change role |
| PATCH | `/api/admin/users/:id/suspend` | Yes | Superadmin | Suspend user |
| DELETE | `/api/admin/users/:id` | Yes | Superadmin | Delete user |
| GET | `/api/admin/check-email` | Yes | Superadmin | Check email uniqueness |
| GET | `/api/admin/departments` | Yes | Superadmin | List departments |
| POST | `/api/admin/departments` | Yes | Superadmin | Create department |
| DELETE | `/api/admin/departments/:id` | Yes | Superadmin | Delete department |
| GET | `/api/admin/ngos` | Yes | Superadmin | List NGOs |
| POST | `/api/admin/ngos` | Yes | Superadmin | Create NGO |
| DELETE | `/api/admin/ngos/:id` | Yes | Superadmin | Delete NGO |
| GET | `/api/admin/hotspots` | Yes | Superadmin | List hotspots |
| GET | `/api/admin/hotspots/:id` | Yes | Superadmin | Hotspot detail |
| PATCH | `/api/admin/hotspots/:id/status` | Yes | Superadmin | Update hotspot status |
| GET | `/api/admin/analytics/sos` | Yes | Superadmin | SOS analytics |
| GET | `/api/admin/moderation/queue` | Yes | Superadmin | Moderation queue |
| POST | `/api/admin/moderation/:id/dismiss` | Yes | Superadmin | Dismiss moderation item |
| DELETE | `/api/admin/moderation/incident/:id` | Yes | Superadmin | Remove incident |
| DELETE | `/api/admin/moderation/comment/:id` | Yes | Superadmin | Remove comment |
| PATCH | `/api/admin/moderation/user/:id/ban` | Yes | Superadmin | Ban user |
| GET | `/api/admin/audit-log` | Yes | Superadmin | Audit log |

### Dashboard

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/dashboard/superadmin/overview` | Yes | Superadmin | Superadmin overview |
| GET | `/api/dashboard/superadmin/users` | Yes | Superadmin | Superadmin user list |
| PATCH | `/api/dashboard/superadmin/users/:id/status` | Yes | Superadmin | Change user status |
| GET | `/api/dashboard/superadmin/moderation` | Yes | Superadmin | Moderation queue |
| GET | `/api/dashboard/superadmin/hotspots` | Yes | Superadmin | Hotspot oversight |
| GET | `/api/dashboard/superadmin/analytics` | Yes | Superadmin | Analytics |
| GET | `/api/dashboard/superadmin/audit` | Yes | Superadmin | Audit logs |
| GET | `/api/dashboard/department/overview` | Yes | Police department | Department overview |
| GET | `/api/dashboard/department/assignments` | Yes | Police department | Assignments |
| GET | `/api/dashboard/department/activity` | Yes | Police department | Activity |
| GET | `/api/dashboard/ngo/overview` | Yes | NGO | NGO overview |
| GET | `/api/dashboard/ngo/response` | Yes | NGO | Response dashboard |
| GET | `/api/dashboard/ngo/activity` | Yes | NGO | Activity |
| GET | `/api/dashboard/policeman/overview` | Yes | Policeman | Officer overview |
| GET | `/api/dashboard/policeman/hotspot` | Yes | Policeman | Assigned hotspot |
| POST | `/api/dashboard/policeman/report` | Yes | Policeman | Create official report |
| GET | `/api/dashboard/volunteer/overview` | Yes | Volunteer | Volunteer overview |
| GET | `/api/dashboard/volunteer/cases` | Yes | Volunteer | Assigned cases |
| POST | `/api/dashboard/volunteer/check-in` | Yes | Volunteer | Standalone check-in |

### Department

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/department/navigation-meta` | Yes | Police department | Navigation counts |
| GET | `/api/department/overview` | Yes | Police department | Overview |
| GET | `/api/department/policemen` | Yes | Police department | List policemen |
| POST | `/api/department/policemen` | Yes | Police department | Create policeman |
| GET | `/api/department/policemen/:id` | Yes | Police department | Policeman detail |
| PATCH | `/api/department/policemen/:id/deactivate` | Yes | Police department | Deactivate policeman |
| PATCH | `/api/department/policemen/:id/reactivate` | Yes | Police department | Reactivate policeman |
| GET | `/api/department/hotspots` | Yes | Police department | List hotspots |
| POST | `/api/department/hotspots` | Yes | Police department | Create hotspot |
| POST | `/api/department/hotspots/:id/assign` | Yes | Police department | Assign hotspot |
| DELETE | `/api/department/hotspots/:id/assign` | Yes | Police department | Unassign hotspot |
| PATCH | `/api/department/hotspots/:id` | Yes | Police department | Update hotspot |
| DELETE | `/api/department/hotspots/:id` | Yes | Police department | Delete hotspot |
| GET | `/api/department/incidents` | Yes | Police department | Incident list |
| PATCH | `/api/department/incidents/:id/resolve` | Yes | Police department | Resolve incident |
| GET | `/api/department/sos` | Yes | Police department | SOS list |
| PATCH | `/api/department/sos/:id/acknowledge` | Yes | Police department | Acknowledge SOS |
| PATCH | `/api/department/sos/:id/resolve` | Yes | Police department | Resolve SOS |
| GET | `/api/department/zones` | Yes | Police department | Zone list |
| POST | `/api/department/zones` | Yes | Police department | Create zone |
| PATCH | `/api/department/zones/:id` | Yes | Police department | Update zone |
| DELETE | `/api/department/zones/:id` | Yes | Police department | Delete zone |
| GET | `/api/department/activity` | Yes | Police department | Activity report |

### NGO

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/ngo/navigation-meta` | Yes | NGO | Navigation counts |
| GET | `/api/ngo/overview` | Yes | NGO | Overview |
| GET | `/api/ngo/volunteers` | Yes | NGO | List volunteers |
| POST | `/api/ngo/volunteers` | Yes | NGO | Create volunteer |
| GET | `/api/ngo/volunteers/:id` | Yes | NGO | Volunteer detail |
| PATCH | `/api/ngo/volunteers/:id/deactivate` | Yes | NGO | Deactivate volunteer |
| PATCH | `/api/ngo/volunteers/:id/reactivate` | Yes | NGO | Reactivate volunteer |
| GET | `/api/ngo/incidents` | Yes | NGO | Open incidents |
| GET | `/api/ngo/incidents/assigned` | Yes | NGO | Assigned incidents |
| POST | `/api/ngo/incidents/:id/assign` | Yes | NGO | Assign incident |
| DELETE | `/api/ngo/incidents/:id/assign` | Yes | NGO | Unassign incident |
| PATCH | `/api/ngo/incidents/:id/close` | Yes | NGO | Close incident |
| GET | `/api/ngo/sos` | Yes | NGO | SOS feed |
| PATCH | `/api/ngo/sos/:id/respond` | Yes | NGO | Respond to SOS |
| PATCH | `/api/ngo/sos/:id/close` | Yes | NGO | Close SOS |
| GET | `/api/ngo/zones` | Yes | NGO | Visible zones |
| GET | `/api/ngo/activity` | Yes | NGO | Activity |

### Officer

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/officer/navigation-meta` | Yes | Policeman | Navigation counts |
| GET | `/api/officer/overview` | Yes | Policeman | Overview |
| GET | `/api/officer/hotspot` | Yes | Policeman | Current hotspot |
| GET | `/api/officer/sos` | Yes | Policeman | SOS feed |
| PATCH | `/api/officer/sos/:id/acknowledge` | Yes | Policeman | Acknowledge SOS |
| PATCH | `/api/officer/sos/:id/resolve` | Yes | Policeman | Resolve SOS |
| GET | `/api/officer/incidents` | Yes | Policeman | Nearby incidents |
| PATCH | `/api/officer/incidents/:id/resolve` | Yes | Policeman | Resolve incident |
| POST | `/api/officer/incidents` | Yes | Policeman | Create incident report |

### Volunteer Dashboard

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| GET | `/api/volunteer/navigation-meta` | Yes | Volunteer | Navigation counts |
| GET | `/api/volunteer/overview` | Yes | Volunteer | Overview |
| GET | `/api/volunteer/sos` | Yes | Volunteer | SOS feed |
| PATCH | `/api/volunteer/sos/:id/respond` | Yes | Volunteer | Respond to SOS |
| PATCH | `/api/volunteer/sos/:id/close` | Yes | Volunteer | Close SOS |
| GET | `/api/volunteer/cases` | Yes | Volunteer | Assigned cases |
| GET | `/api/volunteer/cases/history` | Yes | Volunteer | Case history |
| PATCH | `/api/volunteer/cases/:id/checkin` | Yes | Volunteer | Check into a case |
| PATCH | `/api/volunteer/cases/:id/close` | Yes | Volunteer | Close a case |
| GET | `/api/volunteer/incidents/map` | Yes | Volunteer | Incident map |
| POST | `/api/volunteer/checkin` | Yes | Volunteer | Standalone check-in |
| GET | `/api/volunteer/checkin/history` | Yes | Volunteer | Check-in history |
| GET | `/api/volunteer/zones` | Yes | Volunteer | Zone visibility |

### Public Volunteer / Police Info

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| POST | `/api/volunteers/register` | No | Public | Volunteer registration surface |
| GET | `/api/volunteers/profile` | Yes | Volunteer | Current volunteer profile |
| POST | `/api/volunteers/alerts` | Yes | Volunteer/Superadmin | Alerts feed action |
| POST | `/api/police/register` | No | Public | Police registration surface |
| GET | `/api/police/profile` | Yes | Policeman | Current police profile |
| POST | `/api/police/alerts` | Yes | Policeman/Superadmin | Alerts feed action |

### Zones and Red Zones

| Method | Path | Auth Required | Roles Allowed | Description |
|---|---|---|---|---|
| POST | `/api/zones/create` | Yes | Department/admin | Create safe zone |
| GET | `/api/zones` | Yes | Broad authenticated roles | List zones |
| PUT | `/api/zones/:id` | Yes | Department/admin | Update zone |
| DELETE | `/api/zones/:id` | Yes | Department/admin | Delete zone |
| POST | `/api/redzones/trigger` | No | Public trigger path | Trigger a red zone alert |

## 4. Error Code Reference

| Status | Meaning | Common causes |
|---|---|---|
| 400 | Bad request | Missing or malformed input |
| 401 | Unauthorized | Missing token, invalid token, expired session |
| 403 | Forbidden | Role mismatch |
| 404 | Not found | Missing route or missing record |
| 409 | Conflict | Duplicate record or invalid state transition |
| 422 | Validation failed | Zod or request body validation error |
| 429 | Too many requests | Global, auth, or AI rate limit exceeded |
| 500 | Internal server error | Unhandled exception or infrastructure fault |

## 5. Realtime Events

Socket.IO is used for alert and location streaming.

### Server-emitted events

| Event | Payload | Notes |
|---|---|---|
| `SOS_CREATED` | SOS alert summary | Emitted when an alert is created |
| `LOCATION_UPDATE` | Alert ID + coordinates | Broadcast for live location tracking |
| `ALERT_STATUS_CHANGED` | Alert ID + status | Status transitions |
| `VOLUNTEER_ACCEPTED` | Alert ID + volunteer info | Volunteer response |
| `POLICE_ACCEPTED` | Alert ID + officer info | Police response |
| `ALERT_RESOLVED` | Alert ID + resolution info | Alert closed |

### Client-emitted events

| Event | Payload | Notes |
|---|---|---|
| `JOIN_USER_ROOM` | User/session identifier | Personal room |
| `JOIN_ALERT_ROOM` | Alert ID | Active SOS room |
| `LEAVE_ALERT_ROOM` | Alert ID | Cleanup |
| `JOIN_DEPARTMENT_ROOMS` | Department scope | Department dashboards |
| `JOIN_NGO_ROOMS` | NGO scope | NGO dashboards |
| `JOIN_OFFICER_ROOMS` | Officer scope | Officer dashboards |
| `SEND_LOCATION` | Alert ID + coordinates | Active SOS broadcast |

## 6. Server Actions

No Next.js server actions are currently implemented in the repository.

## 7. File Uploads

No first-party file upload endpoint is exposed in the current API surface.

The app does expose:

- `GET /api/app/download` for APK delivery
- file-backed evidence models in the schema for future extension

## 8. Postman / Collection

No committed Postman collection was found in the repository.

Suggested next step: create one from the route inventory above and place it under `docs/` or `api/` for team use.

