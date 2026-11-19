-- AlterTable
ALTER TABLE "recarga" ADD COLUMN     "id_transaccion" TEXT,
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "referencia_pasarela" TEXT NOT NULL,
ADD COLUMN     "saldo_resultante" INTEGER,
ADD COLUMN     "url_pago" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "recarga_referencia_pasarela_key" ON "recarga"("referencia_pasarela");

-- CreateIndex
CREATE UNIQUE INDEX "recarga_id_transaccion_key" ON "recarga"("id_transaccion");


-- Consecutivo de las referencias visibles RM-000001, RM-000002… (ADR 0013)
CREATE SEQUENCE IF NOT EXISTS "recarga_referencia_seq" START 1;
