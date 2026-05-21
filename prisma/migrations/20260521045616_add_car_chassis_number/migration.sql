-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "chassisNumber" TEXT;

-- CreateIndex
CREATE INDEX "Car_chassisNumber_idx" ON "Car"("chassisNumber");
