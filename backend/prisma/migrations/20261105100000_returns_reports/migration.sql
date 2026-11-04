-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'RETURNED_TO_WAREHOUSE';
ALTER TYPE "InvoiceStatus" ADD VALUE 'OUT_FOR_DELIVERY';

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('ADMIN', 'PHARMACY', 'DRIVER');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('ORDER_SUBMITTED', 'INVOICE_APPROVED', 'INVOICE_REJECTED', 'INVOICE_ASSIGNED', 'DELIVERY_UPDATED', 'PAYMENT_RECORDED', 'AMOUNT_DUE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('STOCK_QUANTITY_CHANGED', 'INVOICE_STATUS_CHANGED', 'PAYMENT_RECORDED');

-- CreateTable
CREATE TABLE "return_records" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "audience_id" INTEGER,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_entries" (
    "id" SERIAL NOT NULL,
    "actor_user_id" INTEGER NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "return_records_invoice_id_key" ON "return_records"("invoice_id");

-- CreateIndex
CREATE INDEX "notifications_audience_audience_id_idx" ON "notifications"("audience", "audience_id");

-- CreateIndex
CREATE INDEX "audit_entries_resource_type_resource_id_idx" ON "audit_entries"("resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "return_records" ADD CONSTRAINT "return_records_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_entries" ADD CONSTRAINT "audit_entries_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
