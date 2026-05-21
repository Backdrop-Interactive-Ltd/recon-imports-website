-- CreateEnum
CREATE TYPE "CarSaleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'SOLD');

-- AlterTable
ALTER TABLE "Car" ADD COLUMN     "saleStatus" "CarSaleStatus" NOT NULL DEFAULT 'AVAILABLE';

-- CreateIndex
CREATE INDEX "Car_saleStatus_idx" ON "Car"("saleStatus");
