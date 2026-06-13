-- AlterTable
ALTER TABLE "safety_hotspots" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "assigned_policeman_id" UUID;

-- CreateIndex
CREATE INDEX "idx_hotspots_assigned_policeman" ON "safety_hotspots"("assigned_policeman_id");

-- AddForeignKey
ALTER TABLE "safety_hotspots" ADD CONSTRAINT "safety_hotspots_assigned_policeman_id_fkey" FOREIGN KEY ("assigned_policeman_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
