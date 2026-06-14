ALTER TABLE "sos_alerts"
ALTER COLUMN "trigger_latitude" DROP NOT NULL,
ALTER COLUMN "trigger_longitude" DROP NOT NULL;
