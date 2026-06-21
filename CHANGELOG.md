# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Documentation suite for architecture, deployment, environment variables, testing, runbook, glossary, API, and UX reference.

### Changed
- Updated the project handbook to reflect the current web-first implementation.

## [1.0.0] - 2026-06-22

### Added
- Initial monorepo baseline for RakshaAI.
- Express backend with auth, SOS, maps, community, admin, NGO, police, and volunteer routes.
- Next.js web frontend with marketing pages, auth flows, dashboards, maps, community, AI, and SOS UI.
- Prisma schema and migrations for users, alerts, organizations, reports, sessions, and audit records.
- Socket.IO realtime alert propagation and location updates.
- SMTP-based OTP and alert notification support.
- Docker Compose support for local and production-style deployment.

### Changed
- Established JWT access/refresh session handling and role-aware routing.

### Fixed
- Not applicable for the initial release baseline.

### Security
- Introduced hashed credentials, auth middleware, and role-based guards.

