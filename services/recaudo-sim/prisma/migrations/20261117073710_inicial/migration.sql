-- CreateTable
CREATE TABLE "tarjeta_recaudo" (
    "numero" TEXT NOT NULL,
    "saldo" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarjeta_recaudo_pkey" PRIMARY KEY ("numero")
);

-- CreateTable
CREATE TABLE "credito" (
    "id" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "saldo_resultante" INTEGER NOT NULL,
    "acreditado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viaje" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "valor" INTEGER NOT NULL,
    "ruta" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credito_referencia_key" ON "credito"("referencia");

-- CreateIndex
CREATE INDEX "credito_numero_idx" ON "credito"("numero");

-- CreateIndex
CREATE INDEX "viaje_numero_fecha_idx" ON "viaje"("numero", "fecha");

-- AddForeignKey
ALTER TABLE "credito" ADD CONSTRAINT "credito_numero_fkey" FOREIGN KEY ("numero") REFERENCES "tarjeta_recaudo"("numero") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viaje" ADD CONSTRAINT "viaje_numero_fkey" FOREIGN KEY ("numero") REFERENCES "tarjeta_recaudo"("numero") ON DELETE RESTRICT ON UPDATE CASCADE;
