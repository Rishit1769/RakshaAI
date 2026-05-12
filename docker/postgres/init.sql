-- Enable PostGIS and required extensions for RakshaAI
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types used by Prisma schema (Prisma migrations will handle these,
-- but having them here ensures the DB is ready before first migration)

-- Grant privileges to app user
GRANT ALL PRIVILEGES ON DATABASE rakshaai TO rakshaai_user;
