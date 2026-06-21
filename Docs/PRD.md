# Product Requirements Document

RakshaAI

AI-Powered Women Safety and Emergency Response Ecosystem

Source of truth:
- [`AppFlow.md`](AppFlow.md)
- [`BackendSchema.md`](BackendSchema.md)
- [`Implementation.md`](Implementation.md)
- [`API.md`](API.md)
- [`ARCHITECTURE.md`](ARCHITECTURE.md)
- [`DEPLOYMENT.md`](DEPLOYMENT.md)
- [`ENVIRONMENT.md`](ENVIRONMENT.md)
- [`apps/web/src/app/`](../apps/web/src/app)
- [`apps/backend/src/`](../apps/backend/src)
- [`prisma/schema.prisma`](../prisma/schema.prisma)

Status legend:
- Implemented: present in the current repository and wired into the product
- Partial: scaffolded, disabled, or only partially connected end-to-end
- Planned: not yet implemented in the current repo

## 1. Product Overview

| Item | Details |
|---|---|
| Product name | RakshaAI |
| One-line description | An AI-assisted women safety and emergency response platform that connects users, responders, and organizations through SOS, live tracking, maps, community intelligence, and moderation workflows. |
| Problem statement | Women and other at-risk users need faster, less stressful ways to call for help, share location, and coordinate with trusted responders when danger is happening or likely. |
| Target users | End users, volunteers, police departments, police officers, NGO staff, superadmins, organization admins, and legacy worker/admin roles used by the backend. |
| Core value proposition | Reduce the time between danger and assistance by making emergency activation, responder routing, and situational awareness immediate and low friction. |
| Current deployment status | Core web and backend workflows are implemented in the repository and usable in local/dev deployment. The Flutter mobile app is scaffolded but not feature-complete. No production hosting or release pipeline is confirmed from the repository alone. |

### Current Product Positioning

RakshaAI is not a generic dashboard. It is an operational safety system. The product emphasizes:
- fast SOS activation
- live responder coordination
- map-based safety context
- community-sourced incident intelligence
- role-aware operations for police, NGOs, volunteers, and superadmins

### What Exists Today

The repository currently includes:
- working auth, session, and MPIN flows
- SOS creation and live alert status handling
- emergency contacts management
- safety maps and nearby responder lookups
- community reports with comments and likes
- AI chat and AI classification/risk analysis endpoints
- department, NGO, policeman, volunteer, and superadmin dashboards
- organization and worker management
- red zone triggering and notification fan-out

### What Is Still Partial

The following are present but not fully mature:
- journey monitoring is mostly a front-end experience and not a fully persisted end-to-end workflow
- file upload/evidence collection is modeled in the schema but does not have a complete upload product surface
- push notification infrastructure is partially represented by schema and env config, but not fully wired end-to-end
- public self-registration for volunteer and police accounts is intentionally disabled and replaced with managed onboarding
- mobile app functionality is only scaffolded

## 2. User Personas

### Persona Table

| Persona | Who they are | What they need | Primary workflows | Pain points addressed |
|---|---|---|---|---|
| Citizen / User | A woman or other at-risk individual using the safety app for daily movement, emergencies, and awareness | Fast SOS, trusted contacts, live support, location sharing, and simple navigation under stress | Register, sign in, add emergency contacts, trigger SOS, follow active alert state, browse maps, submit community reports, use AI guidance, manage settings | Panic during emergencies, slow manual phone calls, lack of responder visibility, confusion about next steps |
| Volunteer | A verified community responder created by an NGO | Clear incident feed, assignment, availability status, check-ins, and zone awareness | Review SOS alerts, accept a case, update availability, check in, close cases, review incident map, view zones | Fragmented volunteer coordination, unclear availability, duplicate response efforts |
| Policeman | A police officer tied to a department and hotspot assignment | Hotspot visibility, incident feeds, assignment management, and response tooling | See assigned hotspot, acknowledge and resolve SOS, review incidents, submit reports, view nearby stations | Slow handoff between citizen reports and officer action, unclear patrol assignment |
| Police Department | The operational department owner for police users | Manage officers, hotspots, zones, and SOS intake from their jurisdiction | Create policemen, assign hotspots, manage zones, review department SOS and incidents, monitor activity | Lack of centralized jurisdiction management and response history |
| NGO | The operational owner for volunteer coverage | Manage volunteers, response queues, and coverage zones | Create volunteers, assign incidents, respond to SOS, close cases, review activity and zones | Disorganized volunteer dispatch and poor visibility into active cases |
| Superadmin | The platform-level operator | Full user, organization, hotspot, moderation, and audit control | Manage users, departments, NGOs, hotspots, analytics, moderation queue, and audit logs | Need for platform governance, abuse control, and system oversight |
| Organization Admin | A delegated manager within an organization | Ability to manage workers and organization records | Create workers, list workers, deactivate workers, inspect organization details | Delegated operational management without superadmin access |
| Legacy Admin / Worker | Compatibility roles present in the backend schema and middleware | Backward-compatible access to older routes and permission checks | Limited route access, mostly compatibility with older role names and zone views | Migration stability for older role naming and dashboard logic |
| Guardian | A supported but not yet fully surfaced tracking role in the schema | Session-based tracking and visibility for protected users | Planned guardian tracking and alert viewing | Family/caregiver visibility into travel or alert context |

### Persona Notes

#### Citizen / User
This is the primary safety user. The product must feel calm, direct, and panic-proof. The user should be able to move from sign-in to SOS in as few steps as possible and should not be blocked by non-critical integrations such as AI or email delivery.

#### Volunteer
Volunteers are operational responders. Their workflow is about receiving a scoped feed, claiming work, and closing the loop with check-ins and case history rather than performing administrative management.

#### Policeman
Police officers need actionable incident context, location awareness, and hotspot ownership. Their experience is more operational than administrative.

#### Police Department
The department owns officers, hotspots, zones, and jurisdictional activity. It is the bridge between citizen-generated incidents and official response.

#### NGO
The NGO owns volunteer operations, response coverage, and support zones. It is the community response arm of the platform.

#### Superadmin
The superadmin governs the platform and is the only role with access to the largest cross-tenant management surfaces.

#### Organization Admin
This is a constrained operational role for managing workers in a single organization. It exists in the backend and should be treated as delegated admin.

#### Guardian
This role is supported by the schema but is not yet a first-class UI surface. It is a roadmap role rather than a fully shipped one.

## 3. Feature Inventory

| Feature | Description | Roles | Status | Known gaps |
|---|---|---|---|---|
| Account registration and login | Email OTP registration, password login, optional MPIN login, refresh tokens, logout, and session restore | User, all managed roles | Implemented | Legacy direct registration still exists, but the preferred path is OTP registration |
| Password and MPIN settings | Change password, set up MPIN, change MPIN, disable MPIN, and force password change on first login for managed accounts | User, managed roles | Implemented | No forgot-password recovery flow yet |
| Emergency contacts | Add, edit, delete, and mark a primary emergency contact | User | Implemented | No separate contact verification flow |
| SOS creation | Trigger a high-priority emergency alert with optional description and location | User | Implemented | SMS fallback is not implemented |
| SOS live response page | Show active alert state, live location broadcasts, responder acceptance, and cancel action | User | Implemented | Cancellation is only available to the alert owner |
| Real-time socket coordination | Broadcast SOS creation, status changes, responder acceptance, and location updates | All response roles | Implemented | Unauthenticated sockets are limited to read-only behavior |
| Safety map | Show nearby volunteers, police stations, safe zones, incidents, and area risk | User, roles with dashboard access | Implemented | Hospitals are not currently included |
| Community reports | Create, browse, like/upvote, and comment on reports | User and authenticated users | Implemented | Moderation tools exist but public trust signals are still basic |
| Community heatmap | Render incident density and risk context from community reports | User, responders | Implemented | Heatmap logic is server-driven but not formally analytics-backed |
| AI safety assistant | Chat assistant for guidance, support, and safety prompts | Authenticated users | Implemented | Requires Gemini key; falls back to error state if unavailable |
| AI emergency classification | Classify emergency descriptions into alert categories | Authenticated users | Implemented | Not every alert path consumes the classification output yet |
| AI risk analysis | Generate a location-based risk score and safety recommendations | Authenticated users | Implemented | Risk model is prompt-driven and not a deterministic policy engine |
| Journey mode | Front-end journey start/end experience with ETA planning | User | Partial | Persistence and automated route monitoring are not fully wired |
| Department dashboard | Manage policemen, hotspots, zones, incidents, and SOS alerts | Police Department | Implemented | Some legacy route names remain for compatibility |
| NGO dashboard | Manage volunteers, SOS response, incidents, and coverage zones | NGO | Implemented | Public volunteer registration is disabled by design |
| Policeman dashboard | View hotspot, SOS feed, incidents, reports, and nearby stations | Policeman | Implemented | Depends on managed assignment from the department |
| Volunteer dashboard | View SOS feed, cases, maps, zones, and check-ins | Volunteer | Implemented | Volunteer account creation is managed, not self-serve |
| Superadmin dashboard | Manage users, departments, NGOs, hotspots, analytics, moderation, and audit logs | Superadmin | Implemented | Some moderation and analytics views are operational rather than deeply instrumented |
| Organization management | Create and manage organizations and workers | Superadmin, organization admin | Implemented | Organization admin scope is narrower than superadmin scope |
| Red zone alerts | Trigger red zone notifications to nearby departments tied to safe zones | Authenticated users with access | Implemented | No separate scheduled red-zone scanner exists |
| Mobile app download | Generate a presigned APK download URL from MinIO | Public web visitors | Implemented | Only download is implemented, not upload or app store workflows |
| Volunteer/police public registration pages | Inform users that self-registration is disabled and accounts must be created by departments | Prospective volunteers, policemen | Implemented | This is informational only, not an actual signup flow |
| Evidence/file storage | Store evidence and other uploads in the data model | User, responders | Partial | Upload UI and storage workflow are not complete |
| Push notifications | Device token storage and notification planning | User, responders | Partial | Notification delivery is not fully wired end-to-end |
| Guardian tracking | Guardian/tracked user session model | Guardian, User | Planned | No complete UI route or operational workflow yet |
| SMS fallback alerts | Emergency fallback channel beyond email and sockets | All emergency users | Planned | Not present in current implementation |

## 4. Functional Requirements

### Authentication and Session Management

| ID | Requirement | Roles | Priority | Status |
|---|---|---|---|---|
| FR-001 | Users must be able to register using email, OTP verification, full name, phone, Aadhaar number, and password | User | Must Have | Implemented |
| FR-002 | Users must be able to sign in with password using email or phone as the identifier | User, managed roles | Must Have | Implemented |
| FR-003 | Users must be able to sign in with MPIN when MPIN is enabled | User, managed roles | Should Have | Implemented |
| FR-004 | The system must issue an access token and refresh token on successful login or registration | User, managed roles | Must Have | Implemented |
| FR-005 | The system must persist refresh tokens in a secure HttpOnly cookie and rotate them on refresh | User, managed roles | Must Have | Implemented |
| FR-006 | The system must allow logout by invalidating active sessions | User, managed roles | Must Have | Implemented |
| FR-007 | Managed accounts must be forced to change password before using the workspace | Managed roles | Must Have | Implemented |

### Emergency Response

| ID | Requirement | Roles | Priority | Status |
|---|---|---|---|---|
| FR-008 | A user must be able to trigger an SOS alert in one primary action | User | Must Have | Implemented |
| FR-009 | SOS creation must capture the freshest available location when possible | User | Must Have | Implemented |
| FR-010 | SOS creation must continue even if GPS lookup fails | User | Must Have | Implemented |
| FR-011 | SOS alerts must emit realtime events to the victim and responders | All response roles | Must Have | Implemented |
| FR-012 | A user must be able to cancel their own SOS while it is still cancellable | User | Should Have | Implemented |
| FR-013 | The system must maintain an alert status history for every status transition | All response roles | Must Have | Implemented |
| FR-014 | Response roles must be able to acknowledge and resolve alerts according to their scope | Volunteers, policemen, police departments, NGOs | Must Have | Implemented |

### Contacts, Maps, and Awareness

| ID | Requirement | Roles | Priority | Status |
|---|---|---|---|---|
| FR-015 | Users must be able to maintain a list of emergency contacts | User | Must Have | Implemented |
| FR-016 | The system must support live location sharing during active SOS events | User, responders | Must Have | Implemented |
| FR-017 | Users must be able to browse nearby volunteers, police stations, and safe zones on a map | User | Should Have | Implemented |
| FR-018 | Users must be able to browse safety incidents and community reports | User | Should Have | Implemented |
| FR-019 | The system must provide an area risk summary based on nearby incidents and safe zones | User, responders | Should Have | Implemented |

### Community and Moderation

| ID | Requirement | Roles | Priority | Status |
|---|---|---|---|---|
| FR-020 | Authenticated users must be able to create community safety reports | User | Must Have | Implemented |
| FR-021 | Authenticated users must be able to like/upvote reports and add comments | User | Should Have | Implemented |
| FR-022 | Superadmins must be able to review and moderate community content | Superadmin | Must Have | Implemented |
| FR-023 | The system must escalate high-density community incident zones to police email notifications | Superadmin, system | Should Have | Implemented |

### Role-Based Operations

| ID | Requirement | Roles | Priority | Status |
|---|---|---|---|---|
| FR-024 | Superadmins must be able to manage users, departments, NGOs, hotspots, moderation, and audit logs | Superadmin | Must Have | Implemented |
| FR-025 | Police departments must be able to create and manage policemen, hotspots, zones, and department SOS workflows | Police Department | Must Have | Implemented |
| FR-026 | NGOs must be able to create and manage volunteers, incidents, zones, and SOS response workflows | NGO | Must Have | Implemented |
| FR-027 | Policemen must be able to view assigned hotspot context, manage incidents, and respond to SOS alerts | Policeman | Must Have | Implemented |
| FR-028 | Volunteers must be able to accept SOS alerts, check in on cases, and manage availability | Volunteer | Must Have | Implemented |
| FR-029 | Organization admins must be able to create and deactivate workers within their organization | Organization admin | Should Have | Implemented |

### AI, Storage, and Platform Support

| ID | Requirement | Roles | Priority | Status |
|---|---|---|---|---|
| FR-030 | Users must be able to access AI safety chat guidance | Authenticated users | Should Have | Implemented |
| FR-031 | Users must be able to submit a description for AI emergency classification | Authenticated users | Should Have | Implemented |
| FR-032 | Users must be able to request location-based risk analysis | Authenticated users | Should Have | Implemented |
| FR-033 | The platform must expose a mobile app download URL from object storage | Public users | Nice to Have | Implemented |
| FR-034 | The system must track device tokens for future push notifications | User, responders | Nice to Have | Partial |
| FR-035 | The system must support evidence/file upload workflows for future incident handling | User, responders | Nice to Have | Partial |

### Product Integrity Requirements

| ID | Requirement | Roles | Priority | Status |
|---|---|---|---|---|
| FR-036 | The product must keep public volunteer and police registration disabled until managed onboarding is in place | Prospective volunteers, policemen | Must Have | Implemented |
| FR-037 | The product must keep client-side access control aligned with backend authorization, but backend auth remains the security boundary | All roles | Must Have | Implemented |
| FR-038 | The product must show clear loading, error, and empty states for all major workflows | All roles | Should Have | Implemented |

## 5. Non-Functional Requirements

| Category | Requirement | Rationale | Current status |
|---|---|---|---|
| Performance | SOS creation should respond quickly; the backend code comments target sub-500ms response for the create endpoint | SOS is the core safety action and must not feel sluggish | Implemented as an engineering intent; formal SLO monitoring not yet shown in repo |
| Performance | Auth, community, and dashboard APIs should use pagination and selective field loading | Prevent unnecessary payloads and keep mobile/web responsive | Implemented |
| Security | Passwords and MPINs must be hashed; refresh tokens must be hashed at rest | Reduce credential exposure if the database is compromised | Implemented |
| Security | Access tokens must be short-lived and protected by backend verification | Limit token theft blast radius | Implemented |
| Security | Sensitive auth cookies must be HttpOnly and scoped to the auth path | Reduce XSS risk and token leakage | Implemented |
| Security | The backend must enforce role-based access control on every protected route | Prevent client-side spoofing | Implemented |
| Security | Input should be validated and sanitized before business logic runs | Prevent malformed requests and reduce injection risk | Implemented |
| Accessibility | Forms should remain keyboard accessible and provide visible error messaging | Users may be in stressful or low-precision interaction states | Implemented in the current web UI, but not formally audited |
| Accessibility | SOS and emergency pages should stay visually simple and readable under stress | Reduce cognitive load during panic | Implemented |
| Scalability | Realtime alerts should use Socket.IO rooms/scoped events rather than broadcasting everything globally | Support multiple departments, NGOs, and role scopes | Implemented |
| Scalability | Geospatial and analytics queries should use indexes and raw SQL where necessary | Avoid slow map and density queries | Implemented |
| Availability | Non-critical side effects such as email failures must not block SOS creation | Emergency alerting must keep working even if SMTP is degraded | Implemented |
| Availability | The app should degrade gracefully if AI or GPS is unavailable | Core safety actions should still be usable | Implemented |
| Data retention | Sessions expire after the configured refresh lifetime; OTPs expire quickly; audit and alert records persist until explicitly deleted | Preserve accountability while limiting session risk | Implemented, with manual retention management only |
| Observability | Important actions should be logged for debugging and audit support | Helps maintainers trace emergency and admin actions | Implemented, but analytics instrumentation is still lightweight |

## 6. User Stories

### Authentication and Account Access

| Story | Status |
|---|---|
| As a user, I want to verify my email with OTP so that I can create a secure account. | Implemented |
| As a user, I want to sign in with email or phone and a password so that I can access my workspace. | Implemented |
| As a user, I want to sign in with a 6-digit MPIN so that I can re-enter the app faster in urgent moments. | Implemented |
| As a managed user, I want to change my temporary password before using the dashboard so that my account is private. | Implemented |
| As a user, I want my session to restore automatically after a refresh so that I do not have to log in again repeatedly. | Implemented |

### SOS and Live Response

| Story | Status |
|---|---|
| As a user, I want to trigger SOS with one clear action so that help is dispatched immediately. | Implemented |
| As a user, I want the app to use my freshest location during SOS so that responders know where I am. | Implemented |
| As a user, I want to see live alert status changes so that I know help is on the way. | Implemented |
| As a user, I want to cancel my SOS when I am safe so that responders can stand down. | Implemented |
| As a responder, I want to receive alert and location updates in realtime so that I can act quickly. | Implemented |

### Contacts, Map, and Awareness

| Story | Status |
|---|---|
| As a user, I want to add emergency contacts so that my trusted people are notified during an alert. | Implemented |
| As a user, I want to see nearby police stations, volunteers, and safe zones on a map so that I can make safer choices. | Implemented |
| As a user, I want to browse community reports so that I can avoid risky areas. | Implemented |
| As a user, I want to view the risk level of my area so that I can decide whether to travel or wait. | Implemented |

### Community Safety

| Story | Status |
|---|---|
| As a user, I want to submit a community report so that I can warn others about unsafe conditions. | Implemented |
| As a user, I want to like and comment on reports so that the community can corroborate a safety issue. | Implemented |
| As a superadmin, I want to review and moderate reports so that harmful or incorrect content can be removed. | Implemented |

### Role-Based Operations

| Story | Status |
|---|---|
| As a superadmin, I want to manage users, departments, NGOs, hotspots, and audit logs so that the platform stays governed. | Implemented |
| As a police department user, I want to manage policemen, hotspots, zones, and SOS alerts so that my jurisdiction is coordinated. | Implemented |
| As an NGO user, I want to manage volunteers and incidents so that I can dispatch community support. | Implemented |
| As a policeman, I want to see my hotspot and nearby incidents so that I can patrol effectively. | Implemented |
| As a volunteer, I want to accept SOS alerts and check in on cases so that I can help people in my coverage area. | Implemented |
| As an organization admin, I want to create and deactivate workers so that I can manage staff without superadmin intervention. | Implemented |

### AI and Platform Support

| Story | Status |
|---|---|
| As a user, I want an AI assistant that can explain safety steps so that I can act with more confidence. | Implemented |
| As a user, I want to classify an emergency description so that I can better understand the situation. | Implemented |
| As a user, I want a risk score for a location so that I can decide whether the route is acceptable. | Implemented |
| As a visitor, I want to download the mobile app so that I can use the safety workflow on my phone. | Implemented |

### Planned or Partial Stories

| Story | Status |
|---|---|
| As a user, I want a full journey monitoring workflow so that my trip can be tracked end-to-end. | Partial |
| As a user, I want to upload evidence files so that incidents have supporting media. | Partial |
| As a user, I want push notifications for alerts so that I can receive help even when not actively in the app. | Partial |
| As a guardian, I want to monitor a protected user so that I can receive travel and alert visibility. | Planned |
| As a volunteer or policeman, I want SMS fallback alerts so that I can receive emergency messages even if push delivery fails. | Planned |

## 7. Acceptance Criteria

### Feature: Registration and Login

Given a new user
When they submit email, OTP, password, phone, and Aadhaar through the registration flow
Then the system should validate the inputs, create the account, issue tokens, and persist the session.

Edge cases:
- If OTP is expired or incorrect, the account must not be created.
- If the email, phone, or Aadhaar is already used, the system must reject the request.
- If the password or MPIN is weak, the user must be told what to fix.

### Feature: MPIN Setup and Login

Given an authenticated user
When they enable or change MPIN
Then the system should require a 6-digit value, reject weak combinations, and store the MPIN securely.

Edge cases:
- If the current MPIN is wrong, the change must fail.
- If the account has not enabled MPIN, MPIN login must be blocked.
- If the user disables MPIN, password login must still work.

### Feature: SOS Creation

Given an authenticated user
When they press SOS
Then the system should create an alert, include the best available location, emit realtime events, notify emergency contacts, and show the active SOS screen.

Edge cases:
- If GPS permission is denied, the SOS must still be sent.
- If email delivery fails, the SOS must still be created.
- If the alert is already cancelled or resolved, the active alert UI should close.

### Feature: SOS Realtime Tracking

Given an active SOS alert
When the alert status or location changes
Then the active SOS page should update without a manual refresh.

Edge cases:
- If the websocket reconnects, the user should remain able to see the alert state after refresh.
- If no `alertId` is present, the active alert page should return the user to the dashboard.

### Feature: Community Reporting

Given an authenticated user
When they create a community report
Then the report should be saved with coordinates, category, and moderation fields.

Edge cases:
- If the location pin is not selected, the form should not submit.
- If the report has already been upvoted by the user, the next action should remove the vote.
- If there are no reports, the empty state should invite the user to create one.

### Feature: Role-Gated Dashboards

Given a signed-in user
When they open a dashboard route
Then the app should route them to the correct role-specific workspace and keep them out of unauthorized areas.

Edge cases:
- If the user has `mustChangePassword`, they should be redirected to settings first.
- If the role does not match, the user should be sent back to login.
- If the session is missing or invalid, the app should bootstrap or clear auth state accordingly.

### Feature: Department and NGO Operations

Given a department or NGO user
When they open their dashboard
Then they should be able to manage their scoped operational records only.

Edge cases:
- Department users must not manage NGO workers.
- NGO users must not access police-only routes.
- Managed records should remain scoped to the owner organization.

## 8. Out of Scope

| Item | Reason |
|---|---|
| Direct government system integration | Not present in the current implementation and would require external approvals and contracts |
| Smartwatch integration | No code or device integration exists yet |
| Drone deployment | Outside the current product and infrastructure scope |
| Facial recognition surveillance | Explicitly not part of the intended product direction |
| Offline mesh networking | Not supported by the current backend or mobile scaffolding |
| Full SMS fallback system | Not implemented; current emergency channels are web, socket, and email based |
| Hospital directory integration | Not currently surfaced in map or response workflows |
| Public self-service volunteer/police onboarding | Managed onboarding is the current policy |
| Full mobile parity | The mobile app is scaffolded but not feature-complete |

### Accepted Limitations

- The app currently favors managed onboarding over self-service for responder roles.
- Some schema entities exist before the UI fully uses them.
- Some features are intentionally modeled for future expansion rather than current release.
- Security-sensitive workflows prefer graceful degradation over blocking the core emergency action.

## 9. Success Metrics

### Measurement Status

The repository does not show a dedicated analytics pipeline, so most metrics are not yet instrumented end-to-end. The following metrics should be treated as the product success model and instrumented as the next step.

| Metric | How it is tracked | Current baseline | Target |
|---|---|---|---|
| SOS create success rate | Backend response success for `POST /api/sos` | Not instrumented | >= 99.5% |
| SOS p95 response time | API latency logs / APM | Not instrumented | < 500 ms |
| Alert acknowledgment time | Alert status history timestamps | Not instrumented | < 2 minutes for first responder acknowledgment |
| Session refresh success rate | `/auth/refresh` success ratio | Not instrumented | >= 99% |
| Community report engagement | Report upvotes and comments | Not instrumented | Increasing month over month |
| Moderation turnaround time | Audit/moderation timestamps | Not instrumented | Same day for urgent items |
| Emergency contact coverage | Users with at least one contact saved | Not instrumented | High adoption target to be defined during analytics rollout |
| Organization onboarding throughput | Approved organizations and workers | Not instrumented | Business target to be set by operations |

### What Success Looks Like

- Users can trigger SOS quickly and reliably.
- Responders receive enough context to act without switching tools.
- Community intelligence improves awareness without overwhelming users.
- Organizational workflows remain auditable and controlled.
- The system degrades gracefully when non-critical integrations fail.

## 10. Roadmap

### Current Milestone

Confirmed in the repository:
- core auth and session management
- SOS alert creation and realtime tracking
- emergency contact management
- community reporting and moderation
- AI assistance and AI risk/classification workflows
- maps and nearby responder discovery
- role-specific dashboards for superadmin, department, NGO, policeman, and volunteer
- organization and worker management
- red zone alerting

### Next Milestone

Most likely next product work, based on the current implementation gaps:
- finish journey monitoring as a full persisted workflow
- wire evidence/file uploads into the alert and incident flows
- add push notification delivery using stored tokens
- expand mobile app parity beyond scaffold
- consider guardian tracking UI and alert subscriptions

### Future Considerations

Confirmed as likely product directions, but not yet fully built:
- SMS fallback for emergency delivery
- broader alert delivery channels
- more complete analytics and reporting dashboards
- stronger operational monitoring and alerting for backend jobs
- improved mobile app release and distribution workflow

### Deferred Features

Explicitly deferred or not present in the current repo:
- smartwatch integration
- drone support
- facial recognition surveillance
- offline mesh networking
- direct government API integration

### Confidence Levels

| Roadmap item | Confidence |
|---|---|
| Mobile parity and journey persistence | High |
| Push notifications | High |
| Evidence uploads | High |
| Guardian tracking | Medium |
| SMS fallback | Medium |
| Advanced external integrations | Low |

## 11. Open Questions and Decisions

| Question / Decision | Options being considered | Owner | Deadline |
|---|---|---|---|
| Should volunteer and police self-registration remain disabled permanently? | Keep managed onboarding only, or re-enable self-serve onboarding with approvals | Product + engineering | TBD |
| Should journey monitoring become a fully persisted backend workflow in the next release? | Persist journeys now, or keep the current light client-side experience until mobile parity work | Product + engineering | TBD |
| Should push notifications be treated as a next-release core feature? | Implement backend delivery and device registration, or defer until mobile is complete | Product + engineering | TBD |
| Should evidence/file upload use MinIO, another object store, or a partner service? | MinIO for simplicity, cloud object storage for scale, or defer | Engineering + DevOps | TBD |
| Should guardian tracking be added as a first-class UI role? | Build guardian screens, expose read-only tracking, or keep it schema-only for now | Product | TBD |
| Should legacy roles such as `admin`, `department`, and `worker` be consolidated? | Keep compatibility, migrate gradually, or fully normalize now | Engineering | TBD |
| Should SMS fallback be in scope for the first production release? | Yes for high reliability, or no to keep release focused | Product + engineering | TBD |

## 12. Summary

RakshaAI already contains a substantial core safety system:
- account access and managed onboarding
- low-friction SOS and live response
- responder and organization workflows
- community-driven incident intelligence
- AI guidance and risk analysis
- maps, hotspots, zones, and red-zone escalation

The main product gaps are mostly in the "next layer":
- journey persistence
- evidence uploads
- push notifications
- mobile parity
- guardian support

The document should now be treated as the definitive PRD for the current codebase, with implementation status clearly marked in each feature area.
