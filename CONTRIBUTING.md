# Contributing to RakshaAI

Thank you for contributing to RakshaAI. The project is safety-critical in practice, so changes should be precise, reviewed carefully, and verified against the live implementation.

## 1. Welcome

We welcome contributions that:

- improve reliability, safety, or clarity
- fix bugs and regressions
- improve docs, tests, and observability
- refine UX for emergency, auth, and responder flows
- strengthen security and data integrity

Please keep changes aligned with the current codebase rather than the original product idea if the two differ.

## 2. Development Environment

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 15+
- Optional: Docker Desktop

### Local Setup

```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run seed:roles
npm run dev
```

If you use the Docker-based flow, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Common Environment Variables

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

## 3. Project Structure

| Path | Responsibility |
|---|---|
| `apps/backend/src` | API routes, services, middleware, sockets, validation |
| `apps/web/src/app` | Pages and route groups |
| `apps/web/src/components` | Shared UI and layout components |
| `apps/web/src/hooks` | Browser and socket hooks |
| `apps/web/src/lib` | API client, routing helpers, utilities |
| `prisma` | Schema, migrations, seed data |
| `docs` | Canonical handbooks |

## 4. Development Workflow

### Branching

- Use a short-lived feature branch.
- Keep each branch focused on one change.
- Prefer small, reviewable pull requests.

### Commit Messages

- Use a concise imperative summary.
- Include a scope when useful, for example `web: fix sos cancel flow`.

### Before You Open a PR

- run the relevant app locally
- verify the changed route or API path
- check linting for the touched workspace
- confirm the docs stay aligned with the implementation

## 5. Pull Request Process

Include in every PR:

- what changed
- why it changed
- how it was tested
- screenshots or screen recordings for UI changes
- migration notes if the schema changed

Reviewers should check:

- auth and role restrictions
- schema changes and migrations
- API response shape changes
- empty, loading, and error states
- accessibility on changed UI

## 6. Adding a New Feature

Suggested flow:

1. Update the Prisma schema if the feature needs persistence.
2. Run a migration and regenerate the client.
3. Add or update backend validation.
4. Add the service and route/controller logic.
5. Add the web page or component.
6. Gate the feature behind the right auth and role checks.
7. Add docs in `docs/` if the flow is user-visible or operationally important.

## 7. Bug Reports

Include:

- exact route or API path
- what you expected
- what happened instead
- reproduction steps
- screenshots or logs if available
- browser, OS, and role involved

## 8. Code Style

- TypeScript everywhere possible.
- Prefer named exports for shared utilities.
- Keep imports grouped and ordered consistently.
- Use the project’s existing naming patterns for routes, services, hooks, and components.
- Preserve the current design token system in web UI changes.

## 9. Getting Help

Start with:

- the relevant doc under `docs/`
- the nearest route, service, or component file
- the repository search tools

If you are unsure, document the uncertainty in your PR or issue so reviewers can help close the loop.

