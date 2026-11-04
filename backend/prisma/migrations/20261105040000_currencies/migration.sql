-- CreateEnum
CREATE TYPE "InvoiceCurrency" AS ENUM ('USD', 'SYP');

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" INTEGER NOT NULL,
    "usd_to_syp" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "products" ADD COLUMN "pharmacy_price_usd" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "pharmacy_price_syp" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "consumer_price_usd" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "consumer_price_syp" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "calculate_syp_from_rate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "invoice_currency" "InvoiceCurrency" NOT NULL DEFAULT 'SYP';

ALTER TABLE "products" ALTER COLUMN "pharmacy_price_usd" DROP DEFAULT,
ALTER COLUMN "pharmacy_price_syp" DROP DEFAULT,
ALTER COLUMN "consumer_price_usd" DROP DEFAULT,
ALTER COLUMN "consumer_price_syp" DROP DEFAULT;
