# UI/UX Reference

RakshaAI web UI and interaction handbook for the current codebase.

This document is the source-of-truth reference for product, design, QA, and frontend contributors who need to understand how the current experience works in practice.

Related documentation:
- [AppFlow.md](AppFlow.md)
- [BackendSchema.md](BackendSchema.md)
- [Implementation.md](Implementation.md)
- [API.md](API.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRD.md](PRD.md)
- [TRD.md](TRD.md)

Implementation sources used for this reference:
- `apps/web/src/app/`
- `apps/web/src/components/`
- `apps/web/src/hooks/`
- `apps/web/src/lib/`
- `apps/web/src/store/`
- `apps/backend/src/`
- `prisma/schema.prisma`

## 1. UI Strategy

The current product UI is a web-first safety platform with two distinct visual modes:

- Normal mode: calm, trustworthy, and operational.
- Emergency mode: highly visible, urgent, and action-focused.

The implemented interface is not a generic consumer app shell. It is a mixture of:

- A public marketing experience for discovery and onboarding.
- An authentication and account setup experience.
- A role-based operational dashboard for responders and administrators.
- A safety-first public/community layer with maps, reports, and AI assistance.

The previous design brief described an orange/purple, mobile-first product with a bottom navigation model. That is no longer the current implementation. The live web app uses a blue-led token system, desktop sidebar dashboards, and emergency red accents only where urgency is needed.

## 2. Design System Overview

### 2.1 Design Principles

The live UI is built around these observable principles:

- Reduce cognitive load during high-stress flows.
- Keep primary actions visually dominant.
- Use a consistent card-and-panel system across the app.
- Make emergency actions impossible to miss.
- Preserve trust through restraint, spacing, and readable type.
- Prefer clear labels over decorative UI.

### 2.2 Color Tokens

The global theme is defined in `apps/web/src/app/globals.css` and mapped into Tailwind in `apps/web/tailwind.config.ts`.

| Token group | Current values | Usage |
|---|---|---|
| Backgrounds | `#fafafa`, `#ffffff` | Page canvas, cards, panels |
| Foreground text | `#0f172a`, `#334155`, `#64748b` | Primary text, body copy, muted labels |
| Primary | `#0052ff`, `#4d7cff` | Main brand action, links, selected states |
| Emergency | `#d72638` | SOS state, active alert emphasis, danger actions |
| Safe | `#1f9d55` | Safe/ok states, resolved states |
| Warning | `#b7791f`, `#ea580c` | Caution states, secondary alerts |
| AI | `#0052ff` | Assistant surfaces and highlights |
| Dark/Navy | `#0f172a` | Deep contrast panels and headings |

The theme also includes reusable gradients and shadows:

- Accent gradients for hero surfaces and premium cards.
- Emergency shadow treatment for SOS UI.
- Soft shadows for cards and controls.

### 2.3 Typography

Typography is intentionally branded rather than default-system:

| Font | Role |
|---|---|
| Inter | Body and UI sans-serif |
| Calistoga | Display/hero typography |
| JetBrains Mono | Code-like or numeric accents |

The result is a more editorial, trust-oriented look than a plain corporate dashboard.

### 2.4 Shape, Spacing, and Surfaces

The app uses a rounded, card-heavy system:

- Buttons and chips use medium rounding.
- Cards range from subtle to featured and inverted variants.
- Inputs use bordered fields with consistent focus and error states.
- Surface hierarchy is expressed through background color, border opacity, shadow, and contrast rather than heavy ornamentation.

### 2.5 Motion Tokens

The product uses a small number of motion patterns:

- Framer Motion for page and section entrance animation.
- CSS keyframes for pulsing SOS states, floating accents, and subtle map pin motion.
- Loading shimmer/skeleton treatment for async surfaces.

There is no centralized reduced-motion system observed in the inspected implementation, so motion is used conservatively but not globally disabled by preference detection.

### 2.6 Theme Scope

Current implementation is effectively a light theme with contextual dark/emergency sections. There is no user-facing theme toggle or app-wide dark mode switch.

## 3. Layout System

### 3.1 Root Shell

`apps/web/src/app/layout.tsx` provides the global shell:

- `html` language is set to `en`.
- Font variables are wired into the root body.
- The body uses the shared background and body text tokens.
- `DownloadAppButton` is rendered globally on most screens.

### 3.2 Marketing Layout

Marketing and public-facing pages use:

- `MarketingNav`
- `MarketingFooter`
- hero sections with branded copy and CTA bands
- wide content containers tuned for desktop storytelling and mobile stacking

This layout is used for:

- landing page
- public map and community entry points
- public registration/info pages

### 3.3 Auth Layout

Authentication pages use `AuthSplitLayout`:

- Left side: brand storytelling, trust copy, and safety messaging.
- Right side: form card with the active workflow.
- Motion: subtle entrance animation and staggered reveal.

This layout is used to keep auth pages focused while still reinforcing the safety brand.

### 3.4 Dashboard Layout

`DashboardLayout` and `AppShell` are the operational shell for authenticated users:

- Desktop sidebar is visible at `xl` and above.
- Sidebar navigation is role-specific.
- A logout action is always present in the sidebar.
- The top area provides page title, supporting copy, and a small action region.
- Notification state is surfaced via a bell/badge in the header.

Observed behavior:

- Superadmin notification count comes from moderation/navigation metadata.
- Operational roles receive live SOS counts via role-specific metadata and socket joins.
- Mobile does not use a separate full dashboard sidebar in the inspected implementation; content stacks vertically and relies on page-level navigation.

### 3.5 Emergency Layout

Emergency surfaces intentionally deviate from the normal UI:

- Strong red accents.
- Larger target sizes.
- Fewer visual distractions.
- Explicit cancel/resolve pathways.

Examples:

- SOS activation page.
- Active SOS tracking page.
- Danger-state buttons and badges.

## 4. Navigation and Information Architecture

### 4.1 Public Navigation

`MarketingNav` exposes the main public IA:

- Overview
- Solutions
- Resources
- Community
- Safety Map
- Sign in
- Create account

The footer extends the IA with direct links to dashboard, safety, and role-oriented entry points.

### 4.2 Dashboard Navigation

Role-based navigation is generated by `getDashboardNavigation(role)` in `apps/web/src/lib/dashboard-navigation.ts`.

| Role | Primary navigation labels |
|---|---|
| Superadmin | Overview, User Management, Create Dept / NGO, Hotspot Oversight, SOS Analytics, Moderation Queue, Audit Log, Settings |
| Police Department | Overview, Manage Policemen, Hotspot Assignment, Incident Map, SOS Alert Feed, SafeZone / RedZone, Activity Report, Settings |
| NGO | Overview, Manage Volunteers, Incident Response, SOS Feed, SafeZone Awareness, Activity Log, Settings |
| Policeman | Overview, My Hotspot, SOS Alerts, Nearby Incidents, Report Submission, Nearby Stations, Settings |
| Volunteer | Overview, SOS Feed, Assigned Cases, Incident Map, Check-In, SafeZone Map, Settings |
| General user | Overview, Journey, Safety Map, Community, Contacts, Settings |

### 4.3 Route Entry and Redirect Behavior

Observed routing UX:

- Unauthenticated users are redirected to `/auth/login` by the protected route hook.
- Users who must change password are redirected to `/dashboard/settings`.
- Post-login landing is role-specific.
- `/dashboard/admin` is an alias route that forwards to the superadmin area.
- `/map` is promoted in public navigation, but the page itself is protected in the current implementation.

### 4.4 Active State and Back Navigation

The interface uses route-based active states in:

- public nav links
- dashboard sidebar items
- filter pills and category chips

Back navigation is handled page-by-page, usually through:

- browser navigation
- `AppShell` back button support
- explicit cancel actions in emergency flows

## 5. Component Library Reference

The app does not use a large external component framework. Instead, it relies on a compact internal set of primitives.

### 5.1 Layout and Shell Components

| Component | Purpose | UX notes |
|---|---|---|
| `MarketingNav` | Public top navigation | Active state follows pathname |
| `MarketingFooter` | Public footer links | Provides alternate entry points |
| `AuthSplitLayout` | Login/register shell | Keeps auth workflows focused |
| `DashboardLayout` | Role dashboard shell | Sidebar + header + notification area |
| `AppShell` | Page wrapper for dashboard content | Optional back button support |

### 5.2 Foundation Components

| Component | Purpose | UX notes |
|---|---|---|
| `Button` | Standard action control | Variants: primary, secondary, ghost, danger |
| `Card` | Content surface | Variants: default, elevated, featured, inverted |
| `Modal` | Simple overlay dialog | No dedicated focus trap was observed |
| `PageHero` | Large landing section header | Used on marketing and intro pages |
| `SectionHeader` | Section title and supporting text | Common on marketing and dashboard pages |
| `SectionBadge` | Label or status chip | Used for subtle context labeling |

### 5.3 Form Components

| Component | Purpose | UX notes |
|---|---|---|
| `FieldShell` / `Input` / `Textarea` / `Select` | Shared form field styling | Standardizes borders, focus, and labels |
| `FloatingLabelInput` | Elevated text input | Supports inline error text and right-side actions |
| `PasswordStrength` | Password guidance | Shows live strength feedback |
| `FilterPills` | Switch between categories or views | Often used for mode toggles and content filters |

### 5.4 Data and Feedback Components

| Component | Purpose | UX notes |
|---|---|---|
| `MetricCard` | KPI summary card | Used across dashboards and analytics |
| `DataTable` | Structured tabular data | Simple presentation table, no built-in sorting or pagination |
| `LoadingState` | Loading screen/placeholder | Used for async page transitions |
| `SkeletonCards` | Skeleton grid | Used where content lists load lazily |
| `EmptyState` | No-data state | Includes optional action |
| `simple-charts.tsx` | Inline bar/line charts | Lightweight dashboard visualization |

### 5.5 Map and Safety Components

| Component | Purpose | UX notes |
|---|---|---|
| `SafetyMap` | Leaflet-backed map experience | Supports markers, layers, selection, and radius overlays |
| `LiveMiniVectorMapPreview` | Static marketing map preview | Used to communicate the product before login |
| `DownloadAppButton` | Persistent app-download CTA | Hidden on some emergency pages |

### 5.6 Notable Gaps in the Component System

- No centralized toast/snackbar framework.
- No fully featured modal/dialog system with focus management was observed.
- DataTable is intentionally simple and does not solve advanced table UX patterns.
- The design system is utility-driven and token-based rather than a fully documented design token package.

## 6. Page and Route Inventory

### 6.1 Public and Marketing Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/` | Public | Brand landing page | Hero, feature sections, trust copy, CTAs to auth |
| `/map` | Protected in implementation | Safety map discovery | Map, layers, location context, risk summaries |
| `/journey` | General user | Journey planning concept page | Start/end journey controls, ETA-style guidance, links to map/SOS |
| `/community` | Public read, authenticated write | Community incident feed | Filter pills, report cards, likes/comments, empty/loading states |
| `/community/report` | Authenticated | New community report form | Map pin placement, category selection, title/address fields, anonymous toggle |
| `/ai` | Authenticated | Safety assistant chat | Quick prompts, chat bubbles, pending state, enter-to-send |
| `/sos` | Authenticated | Emergency SOS activation | High-urgency styling, service link, SOS type selection, description field |
| `/police/register` | Public informational page | Police onboarding info | Clarifies public self-registration is disabled |
| `/volunteer/register` | Public informational page | Volunteer onboarding info | Clarifies public self-registration is disabled |

### 6.2 Authentication Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/auth/login` | Public | Sign in | Password/MPIN toggle, validation, redirect after login |
| `/auth/register` | Public | New account registration | Multi-step OTP flow, profile completion, progressive disclosure |
| `/auth/setup-mpin` | Authenticated | Create or reset MPIN | 6-digit keypad entry and confirmation |
| `/auth/change-password` | Authenticated or forced-change path | Password update | Shown when `mustChangePassword` is active |

### 6.3 Shared Dashboard and Account Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/dashboard` | Authenticated | General dashboard landing | Role redirect, overview cards, cross-role quick actions |
| `/dashboard/settings` | Authenticated | Account and security settings | Password change, MPIN setup/change, logout |
| `/dashboard/sos-active` | Authenticated | Live SOS tracking session | Status ring, responder timeline, cancel flow, realtime location updates |
| `/dashboard/emergency-contacts` | Authenticated | Emergency contact management | Add/edit/delete/set primary, modal form, empty state, local success toast |
| `/dashboard/admin` | Admin alias | Redirect only | Forwards to the superadmin surface |

### 6.4 Superadmin Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/dashboard/superadmin` | SUPERADMIN | Executive overview | KPI cards, charts, map context, incident signals |
| `/dashboard/superadmin/users` | SUPERADMIN | User management | Search/filter/table operations, management actions |
| `/dashboard/superadmin/create` | SUPERADMIN | Create department/NGO org units | Guided admin creation flow |
| `/dashboard/superadmin/hotspots` | SUPERADMIN | Hotspot oversight | Map-led monitoring and prioritization |
| `/dashboard/superadmin/analytics` | SUPERADMIN | SOS analytics | Chart-driven performance and incident analysis |
| `/dashboard/superadmin/moderation` | SUPERADMIN | Moderation queue | Review and triage public/community content |
| `/dashboard/superadmin/audit` | SUPERADMIN | Audit trail | Historical activity and accountability view |

### 6.5 Police Department Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/dashboard/department` | POLICE_DEPARTMENT | Department overview | Operational KPI summary and live response context |
| `/dashboard/department/activity` | POLICE_DEPARTMENT | Activity reporting | Filtered operational history and reporting |
| `/dashboard/department/assignments` | POLICE_DEPARTMENT | Hotspot assignments | Allocation and operational coordination |
| `/dashboard/department/map` | POLICE_DEPARTMENT | Incident map | Spatial view of incidents and zones |
| `/dashboard/department/policemen` | POLICE_DEPARTMENT | Manage policemen | Roster and assignment management |
| `/dashboard/department/sos` | POLICE_DEPARTMENT | SOS feed | Realtime alert feed with response actions |
| `/dashboard/department/zones` | POLICE_DEPARTMENT | SafeZone / RedZone | Zone visibility and management |

### 6.6 NGO Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/dashboard/ngo` | NGO | NGO overview | Operational summary and response visibility |
| `/dashboard/ngo/activity` | NGO | Activity log | Historical view of work performed |
| `/dashboard/ngo/response` | NGO | Incident response | Coordination of NGO response workflows |
| `/dashboard/ngo/sos` | NGO | SOS feed | Live alert triage and volunteer/response actions |
| `/dashboard/ngo/volunteers` | NGO | Manage volunteers | Volunteer roster management |
| `/dashboard/ngo/zones` | NGO | SafeZone awareness | Awareness and zone mapping |

### 6.7 Policeman Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/dashboard/policeman` | POLICEMAN | Officer overview | Quick view of current workload and alerts |
| `/dashboard/policeman/hotspot` | POLICEMAN | My hotspot | Personal deployment area and status |
| `/dashboard/policeman/sos` | POLICEMAN | SOS alerts | Live incident response feed |
| `/dashboard/policeman/incidents` | POLICEMAN | Nearby incidents | Proximity-based operational awareness |
| `/dashboard/policeman/report` | POLICEMAN | Report submission | Incident/report creation workflow |
| `/dashboard/policeman/stations` | POLICEMAN | Nearby stations | Station reference and support routing |

### 6.8 Volunteer Pages

| Route | Access | Purpose | Key UX behaviors |
|---|---|---|---|
| `/dashboard/volunteer` | VOLUNTEER | Volunteer overview | Assigned work, alerts, and readiness |
| `/dashboard/volunteer/sos` | VOLUNTEER | SOS feed | Triage of active alerts |
| `/dashboard/volunteer/cases` | VOLUNTEER | Assigned cases | Case tracking and progress visibility |
| `/dashboard/volunteer/map` | VOLUNTEER | Incident map | Localized map with operational context |
| `/dashboard/volunteer/check-in` | VOLUNTEER | Check-in workflow | Availability/status confirmation |
| `/dashboard/volunteer/zones` | VOLUNTEER | SafeZone map | Safety coverage and awareness |

## 7. Form and Input Patterns

### 7.1 Global Form Pattern

Most forms follow the same structure:

- One primary action.
- Inline validation where possible.
- Loading state on submission.
- Error text near the field or at the form root.
- Success feedback via navigation, toast, or status update.

The app does not appear to use a single shared form library such as React Hook Form for every surface. Instead, forms are implemented with a mix of controlled inputs, custom validation, and endpoint-backed mutation handling.

### 7.2 Major Forms

| Form | Page | Submission target | Validation and notes | Success behavior | Error behavior |
|---|---|---|---|---|---|
| Login | `/auth/login` | Auth API | Password or MPIN mode; role/session checks | Redirect to role-specific dashboard | Inline errors and auth rejection states |
| Registration | `/auth/register` | Auth API | Multi-step OTP, profile fields, confirmation logic | Token/session bootstrap and next-step redirect | OTP, validation, and server errors surfaced inline |
| MPIN setup | `/auth/setup-mpin` | Auth API | 6-digit numeric entry and confirmation | Enables MPIN for later login | Weak/invalid MPIN and mismatch handling |
| Password change | `/auth/change-password` and `/dashboard/settings` | Auth API | Password rules plus current password checks | Clears forced-change state and returns user to dashboard flow | Password validation and server failure messages |
| SOS activation | `/sos` | SOS API / alert creation | SOS type, description, location when available | Redirects to active SOS tracking page | Location fallback and submission failure messaging |
| Community report | `/community/report` | Community report API | Pin placement required, category and content fields | Adds report and returns to feed or confirmation state | Missing coordinates or form errors block submit |
| Emergency contacts | `/dashboard/emergency-contacts` | Contacts API | Contact fields, primary selection | Updates list and shows success toast | Modal-level and inline validation errors |
| Report submission | `/dashboard/policeman/report` | Police report API | Incident details and operational metadata | Creates report and updates list/history | Validation and request errors |
| Check-in | `/dashboard/volunteer/check-in` | Volunteer status API | Availability/status inputs | Marks volunteer availability | Error state if update fails |
| Organization creation | `/dashboard/superadmin/create` | Admin create API | Department/NGO creation fields | Creates the org entity and updates admin view | Server validation and duplicate handling |

### 7.3 Input Controls and Guidance

Current input treatment includes:

- `FloatingLabelInput` for dense but readable forms.
- `Select` for bounded enumerations.
- `Textarea` for longer descriptions.
- `PasswordStrength` for password quality guidance.
- Filter pills for mode and category switching.

The current implementation favors short, direct field labels and immediate error messaging because the product often serves high-stress scenarios.

## 8. Feedback, States, and Microinteractions

### 8.1 Loading States

Observed loading patterns:

- Skeleton grids for card lists.
- `LoadingState` pages for heavier dashboard transitions.
- Disabled action states during async submission.

### 8.2 Empty States

Empty states are explicit and informative:

- No community reports.
- No emergency contacts.
- No results or no assigned work in role dashboards.

The pattern usually includes:

- a brief explanation
- a suggested next action
- a visual placeholder or card

### 8.3 Inline Errors

Validation and error text typically appears:

- under the affected input
- at the top of the form
- inside a modal when the action is localized

`FloatingLabelInput` uses `role="alert"` for error text so that assistive technologies announce it.

### 8.4 Toasts and Alerts

There is no app-wide toast framework in the inspected implementation. Instead:

- `DownloadAppButton` uses local toast state and `aria-live="polite"`.
- Emergency contacts use local success messaging.

### 8.5 Modals and Confirmations

Modals are used for local edit flows and alert decisions. For destructive or high-risk actions, the UI often uses browser confirmation or a simple modal rather than a complex dialog system.

## 9. Accessibility Baseline

### 9.1 Observed Strengths

- `html lang="en"` is set.
- Error states are announced in key inputs.
- `aria-label` is used for icon-only or non-text controls.
- Decorative icons/SVGs are sometimes marked `aria-hidden`.
- Live download feedback is announced through `aria-live`.

### 9.2 Known Gaps

- Modal focus trap and escape handling are not centralized.
- There is no formal skip-link pattern observed.
- Keyboard-only testing is not encoded as a framework-level guarantee.
- Reduced-motion handling is not centralized.

### 9.3 Accessibility Guidance for Contributors

- Keep primary actions keyboard reachable.
- Preserve label/input associations.
- Do not rely on color alone for status.
- Keep emergency actions large and unambiguous.
- When adding new modal flows, include focus management and close semantics.

## 10. Responsive and Mobile Behavior

### 10.1 Current Responsive Model

The web app is responsive, not native-mobile-first:

- Marketing pages stack down to single-column layouts.
- Auth pages collapse from split layout to stacked content.
- Dashboard navigation becomes less sidebar-driven on smaller screens.
- Map and chart surfaces adapt to container width.

### 10.2 Touch and Small-Screen Considerations

The live implementation already supports:

- large SOS targets
- padded buttons and cards
- compact filter chips
- full-width form controls

### 10.3 What Is Not Implemented

- No dedicated bottom-tab mobile shell in the current web UI.
- No mobile-specific gesture system was observed.
- No separate native app UI is part of the current web experience.

## 11. Motion and Visual Tone

### 11.1 Motion Style

Animation is used as emphasis, not decoration:

- Entrance animations on marketing/auth pages.
- Pulsing and breathing effects on emergency states.
- Map pin and loading motion for system feedback.

### 11.2 Tone by Context

| Context | Tone |
|---|---|
| Landing pages | Reassuring, high-trust, aspirational |
| Auth pages | Focused, minimal, confidence-building |
| Dashboard | Operational, dense, structured |
| SOS flow | Urgent, direct, low-friction |
| AI assistant | Supportive, calm, conversational |
| Community | Informative, civic, awareness-oriented |

## 12. Content and Copy Guidelines

The implemented copy style is concise and action-oriented.

Recommended copy rules:

- Use direct verbs for primary actions.
- Use short explanations for crisis paths.
- Avoid long paragraphs in operational views.
- Keep supporting copy helpful, not promotional, inside dashboards.
- Use trust language in public areas and command language in emergency states.

## 13. Known UI/UX Gaps and Technical Debt

These are current implementation gaps, not design recommendations:

- No centralized toast/snackbar system.
- No robust dialog/focus-management component.
- `Modal` is functional but minimal.
- Some workflows rely on route redirects rather than explicit empty/blocked states.
- Journey planning is currently a client-side concept page rather than a persisted workflow.
- There is no user-facing theme toggle or dark mode.
- The legacy mobile bottom-navigation concept from the original brief is not implemented in the web app.

## 14. Contribution Guidelines

When changing or extending UI:

- Use the existing token system in `globals.css`.
- Prefer the shared button/card/input primitives over ad hoc styling.
- Match the existing state model: loading, empty, success, error.
- Respect role-based navigation and access restrictions.
- Add accessible labels for icon-only controls.
- Keep emergency screens visually distinct from normal flows.
- Update [AppFlow.md](AppFlow.md) if a page flow changes.
- Update [PRD.md](PRD.md) if a feature changes scope.
- Update [TRD.md](TRD.md) if a technical dependency or architecture constraint changes.

## 15. Quick Reference

| Question | Answer |
|---|---|
| What is the main brand color? | Blue (`#0052ff`) |
| Is dark mode implemented? | No, not as a user toggle |
| Is the UI mobile-first? | Responsive web-first, not mobile-native |
| Are dashboards role-based? | Yes |
| Is SOS visually distinct? | Yes, intentionally emergency-red |
| Is there a global toast system? | No |
| Is the map built with Leaflet? | Yes |
| Is the design system external or custom? | Mostly custom, token-driven |
