-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';
ALTER TYPE "UserRole" ADD VALUE 'POLICE_DEPARTMENT';
ALTER TYPE "UserRole" ADD VALUE 'POLICEMAN';
ALTER TYPE "UserRole" ADD VALUE 'NGO';
ALTER TYPE "UserRole" ADD VALUE 'VOLUNTEER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_seed" BOOLEAN NOT NULL DEFAULT false;
