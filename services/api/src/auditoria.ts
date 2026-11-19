// Bitácora de auditoría de operaciones sensibles (RF-12).
// Nunca se guardan contraseñas, tokens ni sus resúmenes en el detalle.
import type { Prisma, PrismaClient } from '@prisma/client';

export type AccionAuditoria =
  | 'REGISTRO'
  | 'INGRESO_EXITOSO'
  | 'INGRESO_FALLIDO'
  | 'CUENTA_BLOQUEADA'
  | 'SESION_RENOVADA'
  | 'REUSO_TOKEN_RENOVACION'
  | 'SALIDA'
  | 'RECUPERACION_SOLICITADA'
  | 'CONTRASENA_RESTABLECIDA'
  | 'TARJETA_AGREGADA'
  | 'TARJETA_RENOMBRADA'
  | 'TARJETA_ELIMINADA'
  | 'RECARGA_INICIADA'
  | 'RECARGA_ACREDITADA'
  | 'RECARGA_RECHAZADA'
  | 'RECARGA_ERROR'
  | 'MONTO_NO_COINCIDE'
  | 'WEBHOOK_RECHAZADO'
  | 'ALERTA_CONFIGURADA'
  | 'PERFIL_ACTUALIZADO'
  | 'CUENTA_ELIMINADA';

type ClienteBd = PrismaClient | Prisma.TransactionClient;

export async function registrarAuditoria(
  bd: ClienteBd,
  accion: AccionAuditoria,
  usuarioId: string | null,
  detalle: Record<string, string | number | boolean | null> = {},
) {
  await bd.auditoria.create({ data: { accion, usuarioId, detalle } });
}
