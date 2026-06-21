# Testing Guide

RakshaAI testing reference for the current repository state.

Source of truth:
- `package.json`
- `apps/backend/package.json`
- `apps/web/package.json`

## 1. Testing Philosophy

The project should be tested from the most safety-critical paths outward:

- auth and session handling
- SOS creation and alert lifecycle
- role-based access control
- persistence and migrations
- map and report workflows

## 2. Test Stack

Current tooling present in package manifests:

- Jest in the backend workspace
- Next.js linting in the web workspace
- TypeScript in both runtime surfaces

No first-party test files are currently committed in the repository.

## 3. Running Tests

```bash
npm test
npm --workspace=apps/backend run test
npm --workspace=apps/web run lint
```

If you add tests, prefer to keep them close to the code they cover.

## 4. Test Structure

Suggested structure:

- unit tests near utilities and services
- integration tests near API flows
- end-to-end tests in a dedicated folder such as `e2e/` or `tests/`

## 5. Unit Testing Guide

Good unit targets:

- auth helpers
- response helpers
- rate limit helpers
- token utilities
- validation helpers

Example:

```ts
describe('sendSuccess', () => {
  it('returns the standard success envelope', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

## 6. Integration Testing Guide

Good integration targets:

- auth routes
- SOS creation
- emergency contact CRUD
- admin role checks
- dashboard endpoints

Use a dedicated test database so migrations can run without touching shared data.

## 7. End-to-End Testing Guide

Recommended E2E flows:

- register and log in
- trigger SOS
- view active SOS
- manage emergency contacts
- verify role redirect behavior

## 8. Testing Conventions

- use arrange-act-assert
- keep tests isolated
- avoid order-dependent suites
- prefer explicit data setup

## 9. Mocking Guide

Mock:

- Prisma for unit tests
- fetch for frontend request tests
- SMTP for mail flows
- MinIO for storage
- JWT verification for auth edges

## 10. CI Test Execution

No repository workflow currently runs tests in CI, because no GitHub Actions file is committed.

Recommended CI baseline:

- install dependencies
- run lint
- run tests
- build backend
- build web

## 11. Coverage and Gap Analysis

Current gap:

- no committed first-party automated test suite

Highest-priority additions:

- auth flow tests
- SOS lifecycle tests
- RBAC tests
- migration smoke tests

