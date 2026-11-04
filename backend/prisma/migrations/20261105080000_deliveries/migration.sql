-- CreateEnum
CREATE TYPE "DeliveryResult" AS ENUM ('DELIVERED_PAID', 'DELIVERED_UNPAID', 'NOT_DELIVERED');

-- CreateEnum
CREATE TYPE "NonDeliveryReason" AS ENUM ('PHARMACY_CLOSED', 'PAYMENT_UNAVAILABLE');

-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'DELIVERED_PAID';
ALTER TYPE "InvoiceStatus" ADD VALUE 'DELIVERED_UNPAID';
ALTER TYPE "InvoiceStatus" ADD VALUE 'NOT_DELIVERED';

-- CreateTable
CREATE TABLE "delivery_assignments" (
    "id" SERIAL NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "assigned_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_events" (
    "id" SERIAL NOT NULL,
    "assignment_id" INTEGER NOT NULL,
    "invoice_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "result" "DeliveryResult" NOT NULL,
    "non_delivery_reason" "NonDeliveryReason",
    "note" VARCHAR(500),
    "recipient_name" VARCHAR(120),
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_assignments_invoice_id_key" ON "delivery_assignments"("invoice_id");

-- CreateIndex
CREATE INDEX "delivery_assignments_driver_id_idx" ON "delivery_assignments"("driver_id");

-- CreateIndex
CREATE INDEX "delivery_events_assignment_id_idx" ON "delivery_events"("assignment_id");

-- CreateIndex
CREATE INDEX "delivery_events_invoice_id_idx" ON "delivery_events"("invoice_id");

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_assignments" ADD CONSTRAINT "delivery_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_events" ADD CONSTRAINT "delivery_events_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "delivery_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
