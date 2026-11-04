-- CreateTable
CREATE TABLE "pharmacy_sessions" (
    "id" SERIAL NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pharmacy_sessions_pharmacy_id_idx" ON "pharmacy_sessions"("pharmacy_id");

-- AddForeignKey
ALTER TABLE "pharmacy_sessions" ADD CONSTRAINT "pharmacy_sessions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One active session per pharmacy. Prisma cannot express a partial unique index in the schema.
CREATE UNIQUE INDEX "pharmacy_sessions_one_active_per_pharmacy" ON "pharmacy_sessions"("pharmacy_id") WHERE "revoked_at" IS NULL;
