ALTER TABLE "community_reports"
  ADD COLUMN "alert_sent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pin_color" VARCHAR(20) NOT NULL DEFAULT 'white',
  ADD COLUMN "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "community_reports"
SET
  "score" = "upvote_count",
  "pin_color" = CASE
    WHEN "upvote_count" = 0 THEN 'white'
    WHEN "upvote_count" < 10 THEN 'yellow'
    ELSE 'red'
  END,
  "updated_at" = CURRENT_TIMESTAMP;

CREATE TABLE "report_comments" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "report_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_report_comments_report_created"
  ON "report_comments"("report_id", "created_at" DESC);

ALTER TABLE "report_comments"
  ADD CONSTRAINT "report_comments_report_id_fkey"
  FOREIGN KEY ("report_id") REFERENCES "community_reports"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "report_comments"
  ADD CONSTRAINT "report_comments_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
