# RakshaAI — Database Architecture

PostgreSQL 15+ with PostGIS extension.  
ORM: Prisma Client (Node.js).

## Folder Structure

```
database/
├── schema/          # Human-readable schema documentation
├── migrations/      # Prisma migration files (auto-generated)
├── seed/            # Seed scripts for initial data
├── erd/             # Entity-Relationship Diagram descriptions
└── README.md        # This file
```

## Connection

```
postgresql://rakshaai_user:devpassword@localhost:5432/rakshaai_dev
```

Set `DATABASE_URL` in `apps/backend/.env`.

## Running Migrations

```bash
cd apps/backend
npx prisma migrate dev --name <migration_name>
```

## Seeding

```bash
cd apps/backend
npx ts-node prisma/seed.ts
```

## Required PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

## Role Hierarchy

| Role               | Description                                      |
|--------------------|--------------------------------------------------|
| `super_admin`      | Platform god-mode — manages organizations        |
| `organization_admin`| Manages workers within their org                |
| `worker`           | Handles cases/tasks within organization          |
| `user`             | End-user of the safety platform                  |
| `volunteer`        | Community responder                              |
| `police`           | Law enforcement account                          |
| `admin`            | Legacy admin role                                |
| `guardian`         | Emergency contact with tracking access           |
