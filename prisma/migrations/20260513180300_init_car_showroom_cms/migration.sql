-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "VehicleCategoryType" AS ENUM ('BODY_TYPE', 'STOCK_TYPE', 'PREFERENCE');

-- CreateEnum
CREATE TYPE "CarBodyType" AS ENUM ('SEDAN', 'HATCHBACK', 'SUV', 'CROSSOVER', 'MPV', 'PASSENGER_VAN', 'WAGON', 'OTHER');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('OCTANE', 'DIESEL', 'ELECTRIC', 'HYBRID', 'OCTANE_HYBRID', 'OTHER');

-- CreateEnum
CREATE TYPE "TransmissionType" AS ENUM ('AUTOMATIC', 'MANUAL', 'CVT', 'E_CVT', 'SEMI_AUTOMATIC', 'TIPTRONIC', 'OTHER');

-- CreateEnum
CREATE TYPE "CarCondition" AS ENUM ('BRAND_NEW', 'PRE_OWNED', 'RECONDITIONED', 'USED');

-- CreateEnum
CREATE TYPE "StockType" AS ENUM ('BRAND_NEW', 'PRE_OWNED', 'PRE_ORDER', 'RECONDITIONED');

-- CreateEnum
CREATE TYPE "CarFeatureType" AS ENUM ('FEATURE', 'SAFETY');

-- CreateEnum
CREATE TYPE "SiteSettingType" AS ENUM ('STRING', 'TEXT', 'NUMBER', 'BOOLEAN', 'JSON', 'URL', 'IMAGE_URL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_PROGRESS', 'CLOSED', 'SPAM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuctionSheetStatus" AS ENUM ('NEW', 'PROCESSING', 'REPORT_READY', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "imageUrl" TEXT,
    "type" "VehicleCategoryType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "mileage" TEXT NOT NULL,
    "bodyType" "CarBodyType" NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "transmission" "TransmissionType" NOT NULL,
    "condition" "CarCondition" NOT NULL,
    "origin" TEXT,
    "grade" TEXT,
    "location" TEXT,
    "packageName" TEXT,
    "stockType" "StockType" NOT NULL,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "engine" TEXT,
    "driveTrain" TEXT,
    "description" TEXT,
    "videoImageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarImage" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarFeature" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CarFeatureType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CarFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "SiteSettingType" NOT NULL DEFAULT 'STRING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellCarLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "carName" TEXT NOT NULL,
    "model" TEXT,
    "registrationYear" TEXT,
    "mileage" TEXT,
    "offeredPrice" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellCarLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementLead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "carName" TEXT NOT NULL,
    "model" TEXT,
    "modelYear" TEXT,
    "mileage" TEXT,
    "details" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionSheetRequest" (
    "id" TEXT NOT NULL,
    "chassisNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "feeAmount" INTEGER NOT NULL DEFAULT 800,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "AuctionSheetStatus" NOT NULL DEFAULT 'NEW',
    "reportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionSheetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCategory_slug_key" ON "VehicleCategory"("slug");

-- CreateIndex
CREATE INDEX "VehicleCategory_type_idx" ON "VehicleCategory"("type");

-- CreateIndex
CREATE INDEX "VehicleCategory_isActive_idx" ON "VehicleCategory"("isActive");

-- CreateIndex
CREATE INDEX "VehicleCategory_sortOrder_idx" ON "VehicleCategory"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Car_slug_key" ON "Car"("slug");

-- CreateIndex
CREATE INDEX "Car_brandId_idx" ON "Car"("brandId");

-- CreateIndex
CREATE INDEX "Car_bodyType_idx" ON "Car"("bodyType");

-- CreateIndex
CREATE INDEX "Car_stockType_idx" ON "Car"("stockType");

-- CreateIndex
CREATE INDEX "Car_condition_idx" ON "Car"("condition");

-- CreateIndex
CREATE INDEX "Car_isPublished_idx" ON "Car"("isPublished");

-- CreateIndex
CREATE INDEX "Car_isFeatured_idx" ON "Car"("isFeatured");

-- CreateIndex
CREATE INDEX "Car_year_idx" ON "Car"("year");

-- CreateIndex
CREATE INDEX "Car_price_idx" ON "Car"("price");

-- CreateIndex
CREATE INDEX "CarImage_carId_idx" ON "CarImage"("carId");

-- CreateIndex
CREATE INDEX "CarImage_isPrimary_idx" ON "CarImage"("isPrimary");

-- CreateIndex
CREATE INDEX "CarImage_sortOrder_idx" ON "CarImage"("sortOrder");

-- CreateIndex
CREATE INDEX "CarFeature_carId_idx" ON "CarFeature"("carId");

-- CreateIndex
CREATE INDEX "CarFeature_type_idx" ON "CarFeature"("type");

-- CreateIndex
CREATE INDEX "CarFeature_sortOrder_idx" ON "CarFeature"("sortOrder");

-- CreateIndex
CREATE INDEX "HeroSlide_isActive_idx" ON "HeroSlide"("isActive");

-- CreateIndex
CREATE INDEX "HeroSlide_sortOrder_idx" ON "HeroSlide"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateIndex
CREATE INDEX "SellCarLead_status_idx" ON "SellCarLead"("status");

-- CreateIndex
CREATE INDEX "SellCarLead_createdAt_idx" ON "SellCarLead"("createdAt");

-- CreateIndex
CREATE INDEX "RequirementLead_status_idx" ON "RequirementLead"("status");

-- CreateIndex
CREATE INDEX "RequirementLead_createdAt_idx" ON "RequirementLead"("createdAt");

-- CreateIndex
CREATE INDEX "AuctionSheetRequest_chassisNumber_idx" ON "AuctionSheetRequest"("chassisNumber");

-- CreateIndex
CREATE INDEX "AuctionSheetRequest_email_idx" ON "AuctionSheetRequest"("email");

-- CreateIndex
CREATE INDEX "AuctionSheetRequest_paymentStatus_idx" ON "AuctionSheetRequest"("paymentStatus");

-- CreateIndex
CREATE INDEX "AuctionSheetRequest_status_idx" ON "AuctionSheetRequest"("status");

-- CreateIndex
CREATE INDEX "AuctionSheetRequest_createdAt_idx" ON "AuctionSheetRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_isActive_idx" ON "NewsletterSubscriber"("isActive");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarImage" ADD CONSTRAINT "CarImage_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarFeature" ADD CONSTRAINT "CarFeature_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
