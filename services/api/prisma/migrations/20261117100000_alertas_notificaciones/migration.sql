-- T6 · Alertas de saldo bajo (HU-05, ADR 0014): bandeja de notificaciones del usuario.
-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('SALDO_BAJO', 'RECARGA_EXITOSA');

-- CreateTable
CREATE TABLE "notificacion" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "datos" JSONB NOT NULL DEFAULT '{}',
    "enviada_push" BOOLEAN NOT NULL DEFAULT false,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacion_usuario_id_creada_en_idx" ON "notificacion"("usuario_id", "creada_en");

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

