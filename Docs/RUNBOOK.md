# Runbook

Operational runbook for RakshaAI.

Source of truth:
- `apps/backend/src/`
- `docker/`
- `prisma/`
- `README.md`

## 1. Service Overview

RakshaAI is a safety and emergency-response platform. Its critical components are:

- backend API
- web frontend
- PostgreSQL
- SMTP
- object storage
- realtime Socket.IO transport

## 2. Access and Credentials

Do not store credentials in this document.

Reference locations:

- local development secrets: `.env`
- production secrets: platform secret manager, deployment environment, or infrastructure console

## 3. Common Operational Tasks

### Restart the application

Without Docker:

```bash
npm run build
npm --workspace=apps/backend run start
npm --workspace=apps/web run start
```

With Docker:

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### View logs

Backend logs are written via Winston to the `logs/` directory when enabled by runtime configuration.

Docker:

```bash
docker compose logs -f backend
docker compose logs -f web
```

### Check health

```bash
curl http://localhost:5000/api/health
```

### Run a database migration

```bash
npm --workspace=apps/backend run db:migrate:prod
```

### Seed the database

```bash
npm --workspace=apps/backend run db:seed
```

or, for the root helper:

```bash
npm run seed:roles
```

### Check database connectivity

- verify `DATABASE_URL`
- confirm PostgreSQL accepts connections
- run `curl /api/health`

### Check storage connectivity

- verify MinIO env vars
- confirm the bucket exists
- check the APK download endpoint

### Add an admin user manually

Recommended flow:

1. Create the user with the proper role in Prisma or a seed script.
2. Hash the password with the backend hashing utility.
3. Mark the account active and verified.
4. Confirm login and role redirect.

## 4. Incident Response Playbooks

### Application down

Immediate checks:

- health endpoint
- backend logs
- database connectivity
- environment variables

### Database connection failure

Immediate checks:

- `DATABASE_URL`
- PostgreSQL service health
- migration state

### Storage outage

Immediate checks:

- MinIO endpoint and credentials
- bucket configuration

### Email queue backed up

Immediate checks:

- SMTP credentials
- provider health
- backend logs for auth or delivery failures

### Authentication failures for all users

Immediate checks:

- JWT secrets
- refresh cookie behavior
- auth middleware errors

### Deployment failure

Immediate checks:

- build logs
- migration output
- runtime env vars

## 5. Scheduled Maintenance

Recommended maintenance flow:

1. Announce maintenance window.
2. Take a backup.
3. Stop writes if needed.
4. Apply migrations.
5. Restart services.
6. Verify health, login, and SOS.

## 6. Backup and Recovery

Back up:

- PostgreSQL
- object storage
- deployment configuration

Recovery order:

1. restore database
2. restore storage
3. restart backend
4. verify health and auth

## 7. Scaling Procedures

Current scaling model is primarily vertical and replica-based at the container/process level.

Recommended order:

- add CPU/memory before redesign
- scale read-heavy components carefully
- introduce a queue worker when async load grows

## 8. Monitoring Checklist

Daily:

- health endpoint
- auth failures
- email failures
- storage failures

Weekly:

- log retention
- dependency updates
- backup verification

## 9. Contact and Escalation

Use the project’s team communication channel and escalation path defined by the deployer.

