-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('NATIONAL_MEDICINE', 'FOREIGN_MEDICINE', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "SaleUnit" AS ENUM ('PACK', 'BOX', 'SACHET');

-- AlterTable
ALTER TABLE "products" ADD COLUMN "category" "ProductCategory" NOT NULL DEFAULT 'NATIONAL_MEDICINE',
ADD COLUMN "sale_unit" "SaleUnit" NOT NULL DEFAULT 'PACK',
ADD COLUMN "offer_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "offer_paid_units" INTEGER,
ADD COLUMN "offer_free_units" INTEGER,
ADD COLUMN "offer_starts_at" TIMESTAMP(3),
ADD COLUMN "offer_ends_at" TIMESTAMP(3);

ALTER TABLE "products" ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "sale_unit" DROP DEFAULT;
