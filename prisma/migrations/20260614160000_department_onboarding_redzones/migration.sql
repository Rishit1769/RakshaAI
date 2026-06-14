DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'department'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'department';
  END IF;
END $$;

CREATE TYPE "RedZoneSeverity" AS ENUM ('low', 'medium', 'high');

ALTER TABLE "users"
ALTER COLUMN "phone" DROP NOT NULL;

ALTER TABLE "users"
ADD COLUMN "department_id" UUID;

CREATE INDEX "idx_users_department_id" ON "users"("department_id");

ALTER TABLE "safe_zones"
ADD COLUMN "radius_meters" DOUBLE PRECISION,
ADD COLUMN "department_id" UUID,
ADD COLUMN "department_type" VARCHAR(50),
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "idx_safe_zones_department" ON "safe_zones"("department_id");

CREATE TABLE "red_zones" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "triggered_by_id" UUID,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "severity" "RedZoneSeverity" NOT NULL,
  "description" TEXT NOT NULL,
  "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "red_zones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_red_zones_triggered_at" ON "red_zones"("triggered_at" DESC);

CREATE TABLE "_redzone_notified_departments" (
  "A" UUID NOT NULL,
  "B" UUID NOT NULL
);

CREATE UNIQUE INDEX "_redzone_notified_departments_AB_unique" ON "_redzone_notified_departments"("A", "B");
CREATE INDEX "_redzone_notified_departments_B_index" ON "_redzone_notified_departments"("B");

ALTER TABLE "users"
ADD CONSTRAINT "users_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "safe_zones"
ADD CONSTRAINT "safe_zones_department_id_fkey"
FOREIGN KEY ("department_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "red_zones"
ADD CONSTRAINT "red_zones_triggered_by_id_fkey"
FOREIGN KEY ("triggered_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "_redzone_notified_departments"
ADD CONSTRAINT "_redzone_notified_departments_A_fkey"
FOREIGN KEY ("A") REFERENCES "red_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_redzone_notified_departments"
ADD CONSTRAINT "_redzone_notified_departments_B_fkey"
FOREIGN KEY ("B") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
