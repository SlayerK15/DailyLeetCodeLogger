-- CreateEnum
CREATE TYPE "DayStatus" AS ENUM ('PROGRESSED', 'PRACTICED', 'INACTIVE');

-- AlterTable
ALTER TABLE "DailyLog" ADD COLUMN     "rankingSnapshot" INTEGER,
ADD COLUMN     "status" "DayStatus" NOT NULL DEFAULT 'INACTIVE';
