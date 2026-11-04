-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "custom_reason" VARCHAR(500),
ADD COLUMN "rejection_reason_id" INTEGER;

-- AlterTable
ALTER TABLE "product_stocks" ADD COLUMN "reserved_quantity" INTEGER NOT NULL DEFAULT 0;

-- Reserved stock cannot exceed the physical quantity in that warehouse.
ALTER TABLE "product_stocks" ADD CONSTRAINT "product_stocks_reserved_within_quantity" CHECK ("reserved_quantity" >= 0 AND "reserved_quantity" <= "quantity");

-- CreateTable
CREATE TABLE "rejection_reasons" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rejection_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rejection_reasons_label_key" ON "rejection_reasons"("label");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rejection_reason_id_fkey" FOREIGN KEY ("rejection_reason_id") REFERENCES "rejection_reasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
