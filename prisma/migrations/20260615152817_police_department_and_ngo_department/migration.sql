-- DropForeignKey
ALTER TABLE "_redzone_notified_departments" DROP CONSTRAINT "_redzone_notified_departments_A_fkey";

-- DropForeignKey
ALTER TABLE "_redzone_notified_departments" DROP CONSTRAINT "_redzone_notified_departments_B_fkey";

-- AlterTable
ALTER TABLE "safe_zones" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "_redzone_notified_departments" ADD CONSTRAINT "_redzone_notified_departments_A_fkey" FOREIGN KEY ("A") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_redzone_notified_departments" ADD CONSTRAINT "_redzone_notified_departments_B_fkey" FOREIGN KEY ("B") REFERENCES "red_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
