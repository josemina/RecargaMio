// Bandeja de notificaciones y dispositivos del usuario (HU-05 CA-2, ADR 0014).
// Cada aviso se guarda primero en la base; el envío por FCM es un extra que puede fallar sin perder el aviso.
import type { PrismaClient, TipoNotificacion } from '@prisma/client';
import type { Logger } from 'pino';
import type { EnviadorPush } from '../../integraciones/push';
import { ErrorApi } from '../../middleware/errores';

export interface NuevoAviso {
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  datos: Record<string, string>;
}

interface Dependencias {
  prisma: PrismaClient;
  push: EnviadorPush;
  logger: Logger;
  ahora: () => Date;
}

export function crearServicioNotificaciones({ prisma, push, logger, ahora }: Dependencias) {
  return {
    /** Guarda el aviso en la bandeja y, si hay FCM, lo envía a los teléfonos Android del usuario. Nunca lanza por FCM. */
    async notificar(usuarioId: string, aviso: NuevoAviso) {
      const notificacion = await prisma.notificacion.create({ data: { usuarioId, ...aviso, creadaEn: ahora() } });
      const datos = { ...aviso.datos, tipo: aviso.tipo, notificacionId: notificacion.id };
      try {
        const dispositivos = await prisma.dispositivo.findMany({ where: { usuarioId }, select: { tokenFcm: true } });
        const { enviados, invalidos } = await push.enviar(
          dispositivos.map((d) => d.tokenFcm),
          { titulo: aviso.titulo, cuerpo: aviso.cuerpo, datos },
        );
        if (invalidos.length) await prisma.dispositivo.deleteMany({ where: { tokenFcm: { in: invalidos } } });
        if (enviados > 0) await prisma.notificacion.update({ where: { id: notificacion.id }, data: { enviadaPush: true } });
      } catch (err) {
        logger.warn({ err, notificacionId: notificacion.id }, 'No se pudo enviar el aviso por FCM; queda en la bandeja de la app');
      }
      return notificacion;
    },

    async listar(usuarioId: string, { limite, soloNoLeidas }: { limite: number; soloNoLeidas?: string }) {
      const [notificaciones, noLeidas] = await Promise.all([
        prisma.notificacion.findMany({
          where: { usuarioId, ...(soloNoLeidas ? { leida: false } : {}) },
          orderBy: { creadaEn: 'desc' },
          take: limite,
          select: { id: true, tipo: true, titulo: true, cuerpo: true, datos: true, leida: true, creadaEn: true },
        }),
        prisma.notificacion.count({ where: { usuarioId, leida: false } }),
      ]);
      return { noLeidas, notificaciones };
    },

    async marcarLeida(usuarioId: string, id: string) {
      const { count } = await prisma.notificacion.updateMany({ where: { id, usuarioId }, data: { leida: true } });
      if (count === 0) throw new ErrorApi(404, 'NOTIFICACION_NO_ENCONTRADA', 'La notificación no existe.');
    },

    async marcarTodas(usuarioId: string) {
      const { count } = await prisma.notificacion.updateMany({ where: { usuarioId, leida: false }, data: { leida: true } });
      return { marcadas: count };
    },

    /** Si el token ya estaba en otra cuenta (el teléfono cambió de usuario), pasa a la cuenta actual. */
    async registrarDispositivo(usuarioId: string, { token, plataforma }: { token: string; plataforma: string }) {
      await prisma.dispositivo.upsert({
        where: { tokenFcm: token },
        create: { usuarioId, tokenFcm: token, plataforma },
        update: { usuarioId, plataforma },
      });
      return { registrado: true, envioPush: push.nombre !== 'ninguno' };
    },

    /** Al cerrar sesión la app quita el token, para que el teléfono no reciba avisos de esa cuenta. */
    async quitarDispositivo(usuarioId: string, token: string) {
      await prisma.dispositivo.deleteMany({ where: { usuarioId, tokenFcm: token } });
    },
  };
}

export type ServicioNotificaciones = ReturnType<typeof crearServicioNotificaciones>;
