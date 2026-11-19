-- CreateEnum
CREATE TYPE "EstadoRecarga" AS ENUM ('PENDIENTE', 'APROBADA', 'ACREDITADA', 'RECHAZADA', 'ERROR', 'FALLA_ACREDITACION');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('NEQUI', 'PSE', 'BANCOLOMBIA_TRANSFER');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "hash_contrasena" TEXT NOT NULL,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eliminado_en" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autorizacion_datos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "version_politica" TEXT NOT NULL,
    "aceptado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,

    CONSTRAINT "autorizacion_datos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "hash_token" TEXT NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "revocada_en" TIMESTAMP(3),

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarjeta" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "numero_cifrado" TEXT NOT NULL,
    "numero_hmac" TEXT NOT NULL,
    "ultimos_4" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarjeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "id" TEXT NOT NULL,
    "tarjeta_id" TEXT NOT NULL,
    "umbral" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "ultima_notificacion" TIMESTAMP(3),

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recarga" (
    "id" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tarjeta_id" TEXT,
    "numero_destino" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "medio_pago" "MedioPago" NOT NULL,
    "estado" "EstadoRecarga" NOT NULL DEFAULT 'PENDIENTE',
    "iniciada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmada_en" TIMESTAMP(3),
    "acreditada_en" TIMESTAMP(3),

    CONSTRAINT "recarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaccion_pasarela" (
    "id" TEXT NOT NULL,
    "recarga_id" TEXT NOT NULL,
    "id_externo" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "checksum_evento" TEXT,
    "cuerpo" JSONB NOT NULL,
    "recibida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaccion_pasarela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_fcm" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "detalle" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pqr" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "radicado" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'RADICADA',
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pqr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_correo_key" ON "usuario"("correo");

-- CreateIndex
CREATE INDEX "autorizacion_datos_usuario_id_idx" ON "autorizacion_datos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_hash_token_key" ON "sesion"("hash_token");

-- CreateIndex
CREATE INDEX "sesion_usuario_id_idx" ON "sesion"("usuario_id");

-- CreateIndex
CREATE INDEX "tarjeta_usuario_id_activa_idx" ON "tarjeta"("usuario_id", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "tarjeta_usuario_id_numero_hmac_key" ON "tarjeta"("usuario_id", "numero_hmac");

-- CreateIndex
CREATE UNIQUE INDEX "alerta_tarjeta_id_key" ON "alerta"("tarjeta_id");

-- CreateIndex
CREATE UNIQUE INDEX "recarga_referencia_key" ON "recarga"("referencia");

-- CreateIndex
CREATE INDEX "recarga_estado_iniciada_en_idx" ON "recarga"("estado", "iniciada_en");

-- CreateIndex
CREATE INDEX "recarga_usuario_id_iniciada_en_idx" ON "recarga"("usuario_id", "iniciada_en");

-- CreateIndex
CREATE INDEX "recarga_tarjeta_id_idx" ON "recarga"("tarjeta_id");

-- CreateIndex
CREATE INDEX "transaccion_pasarela_recarga_id_idx" ON "transaccion_pasarela"("recarga_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaccion_pasarela_id_externo_estado_key" ON "transaccion_pasarela"("id_externo", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_token_fcm_key" ON "dispositivo"("token_fcm");

-- CreateIndex
CREATE INDEX "dispositivo_usuario_id_idx" ON "dispositivo"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_fecha_idx" ON "auditoria"("usuario_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "pqr_radicado_key" ON "pqr"("radicado");

-- CreateIndex
CREATE INDEX "pqr_usuario_id_idx" ON "pqr"("usuario_id");

-- AddForeignKey
ALTER TABLE "autorizacion_datos" ADD CONSTRAINT "autorizacion_datos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarjeta" ADD CONSTRAINT "tarjeta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_tarjeta_id_fkey" FOREIGN KEY ("tarjeta_id") REFERENCES "tarjeta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recarga" ADD CONSTRAINT "recarga_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recarga" ADD CONSTRAINT "recarga_tarjeta_id_fkey" FOREIGN KEY ("tarjeta_id") REFERENCES "tarjeta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaccion_pasarela" ADD CONSTRAINT "transaccion_pasarela_recarga_id_fkey" FOREIGN KEY ("recarga_id") REFERENCES "recarga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqr" ADD CONSTRAINT "pqr_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
