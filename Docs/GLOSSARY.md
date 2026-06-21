# Glossary

Alphabetical glossary for RakshaAI domain and implementation terms.

## A

**Access token**  
Short-lived JWT used by the browser to call protected backend routes. Stored in browser storage by the web app.

**Active SOS**  
The live alert state after an SOS has been created and before it is resolved, cancelled, or otherwise closed.

## A-B

**Alert**  
An emergency record in the system, typically modeled as `SosAlert` in the schema.

**Audit log**  
A persisted record of notable platform actions, usually written for admin and operational accountability.

## C

**Community report**  
A user-submitted report about unsafe conditions or suspicious activity, displayed in the community feed.

**CORS origin**  
The configured browser origin allowlist for backend requests. Controlled by `CORS_ORIGIN`.

## D

**Department**  
The police department operational unit that manages officers, zones, and SOS intake.

**Dashboard**  
Role-specific operational UI under `/dashboard/*`.

## E

**Emergency contact**  
A trusted contact linked to a user that can receive alerts or escalation notices.

**Emergency mode**  
The high-urgency visual state used for SOS flows and active alert screens.

## F

**First-time provisioning**  
The account creation flow where a new user verifies email and completes profile setup.

## G

**Guardian session**  
A tracking relationship used to let one user observe or support another user’s journey or alert state.

## H

**Hotspot**  
A geographic area assigned to a department, officer, or responder for operational focus.

## I

**Incident**  
A reported or derived safety event that can be displayed in maps, lists, and dashboards.

## J

**Journey**  
A trip or movement state tracked for safety monitoring. In the current UI it is mostly a user-facing planning surface.

## L

**Live room**  
An Socket.IO room used to push updates to a specific user, role, or alert audience.

## M

**MPIN**  
A short numeric login credential used as a convenience credential alongside password login.

## N

**NGO**  
A non-governmental organization role that manages volunteers and operational response.

## O

**Organization**  
A department, NGO, or other managed group record used for onboarding and administrative hierarchy.

## P

**Police account**  
A responder account associated with police workflows and profile data.

**PostgreSQL**  
Primary relational database engine used by the backend.

**Protected route**  
A page or API path that requires an authenticated user or specific role.

## R

**Red zone**  
A high-risk region or alertable zone with strong safety significance.

**Refresh token**  
Longer-lived token stored in an HttpOnly cookie and used to obtain a new access token.

**Role-based access control**  
Permission model that checks whether a user can access a route or action based on `User.role`.

**Router**  
Express route module under `apps/backend/src/routes`.

## S

**Safe zone**  
A lower-risk or designated safe area shown on maps and zone management views.

**Session**  
Database-backed login session record represented by `UserSession`.

**Socket.IO**  
Realtime transport used for alert and location updates.

**Superadmin**  
Highest operational role in the web app, able to manage users, organizations, moderation, and analytics.

**SOS**  
Emergency assistance request that triggers responder notification and live tracking.

## T

**Token rotation**  
Refresh-token replacement behavior during session renewal.

## U

**User**  
Primary person record in the system. Can represent citizens, responders, or admins depending on role.

**User role**  
The canonical permission label stored in `User.role` and enforced in both backend and frontend routing.

## V

**Volunteer**  
A verified responder who works under an NGO and handles assigned cases or SOS feeds.

## Z

**Zone**  
A mapped area with safety or risk significance, such as safe zones or red zones.

