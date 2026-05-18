-- AlterTable
ALTER TABLE "VehicleCategory" ADD COLUMN     "description" TEXT,
ADD COLUMN     "iconKey" TEXT,
ADD COLUMN     "imageAlt" TEXT,
ADD COLUMN     "routePath" TEXT,
ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "VehicleCategory_showOnHomepage_idx" ON "VehicleCategory"("showOnHomepage");
