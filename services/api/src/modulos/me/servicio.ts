// Perfil y privacidad (T7, RNF-04, Ley 1581 de 2012). Decisiones en ADR 0015.
import { randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import type { Logger } from 'pino';
import { registrarAuditoria } from '../../auditoria';
import type { Correo } from '../../integraciones/correo';
import { ErrorApi } from '../../middleware/errores';

/** Pasado este tiempo, una recarga pendiente abandonada (por ejemplo, un PSE que no se terminó) ya no bloquea el borrado. */
const VENTANA_PENDIENTE_MS = 24 * 60 * 60 * 1000;

const escaparHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Dependencias {
  prisma: PrismaClient;
  correo: Correo;
  logger: Logger;
  ahora: () => Date;
}

const contrasenaIncorrecta = () => new ErrorApi(403, 'CONTRASENA_INCORRECTA', 'La contraseña no es correcta.');

export function crearServicioMe({ prisma, correo, logger, ahora }: Dependencias) {
  async function usuarioVigente(usuarioId: string) {
    const usuario = await prisma.usuario.findFirst({ where: { id: usuarioId, eliminadoEn: null } });
    if (!usuario) throw new ErrorApi(404, 'USUARIO_NO_EXISTE', 'La cuenta no existe.');
    return usuario;
  }

  /** Avisos de seguridad por correo. No se esperan: un fallo del correo no debe deshacer el cambio. */
  function avisar(para: string, asunto: string, lineas: string[]) {
    const texto = lineas.join('\n');
    correo
      .enviar({ para, asunto, texto, html: lineas.map((l) => (l ? `<p>${escaparHtml(l)}</p>` : '')).join('') })
      .catch((err) => logger.warn({ err }, 'No se pudo enviar el aviso por correo'));
  }

  async function perfil(usuarioId: string) {
    const usuario = await prisma.usuario.findFirst({
      where: { id: usuarioId, eliminadoEn: null },
      select: { id: true, nombre: true, correo: true, creadoEn: true, autorizaciones: { orderBy: { aceptadoEn: 'desc' }, take: 1 } },
    });
    if (!usuario) throw new ErrorApi(404, 'USUARIO_NO_EXISTE', 'La cuenta no existe.');
    const [autorizacion] = usuario.autorizaciones;
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      creadoEn: usuario.creadoEn,
      politica: autorizacion ? { version: autorizacion.versionPolitica, aceptadaEn: autorizacion.aceptadoEn } : null,
    };
  }

  return {
    perfil,

    /** Rectificar los datos (Ley 1581, art. 8). El correo nuevo debe estar libre y exige la contraseña actual. */
    async actualizar(usuarioId: string, datos: { nombre?: string; correo?: string; contrasenaActual?: string }, ip?: string) {
      const usuario = await usuarioVigente(usuarioId);
      const cambiaCorreo = datos.correo !== undefined && datos.correo !== usuario.correo;
      if (cambiaCorreo && !(await argon2.verify(usuario.hashContrasena, datos.contrasenaActual!))) throw contrasenaIncorrecta();

      const cambios = {
        ...(datos.nombre !== undefined && datos.nombre !== usuario.nombre ? { nombre: datos.nombre } : {}),
        ...(cambiaCorreo ? { correo: datos.correo } : {}),
      };
      if (Object.keys(cambios).length > 0) {
        try {
          await prisma.usuario.update({ where: { id: usuarioId }, data: cambios });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new ErrorApi(409, 'CORREO_REGISTRADO', 'Ya existe una cuenta con ese correo.');
          }
          throw error;
        }
        await registrarAuditoria(prisma, 'PERFIL_ACTUALIZADO', usuarioId, { campos: Object.keys(cambios).join(','), ip: ip ?? null });
        // Aviso al correo anterior: si el cambio no lo hizo el titular, se entera
        if (cambiaCorreo) {
          avisar(usuario.correo, 'Cambiaste el correo de tu cuenta de RecargaMIO', [
            `Hola, ${usuario.nombre}.`,
            '',
            `El correo de tu cuenta de RecargaMIO ahora es ${datos.correo}. Desde ahora ingresa con ese correo.`,
            'Si no hiciste este cambio, radica una PQR o escribe a soporte de inmediato.',
          ]);
        }
      }
      return perfil(usuarioId);
    },

    /**
     * Elimina la cuenta (RNF-04, Ley 1581: supresión). Borra lo que identifica a la persona y conserva,
     * anonimizado, lo que el servicio debe guardar: recargas (conciliación y reclamos), autorización y auditoría.
     */
    async eliminar(usuarioId: string, contrasena: string, ip?: string) {
      const usuario = await usuarioVigente(usuarioId);
      if (!(await argon2.verify(usuario.hashContrasena, contrasena))) throw contrasenaIncorrecta();

      // Hay dinero en camino: una recarga aprobada sin acreditar, o una pendiente reciente
      const limitePendiente = new Date(ahora().getTime() - VENTANA_PENDIENTE_MS);
      const enCurso = await prisma.recarga.count({
        where: {
          usuarioId,
          OR: [{ estado: { in: ['APROBADA', 'FALLA_ACREDITACION'] } }, { estado: 'PENDIENTE', iniciadaEn: { gte: limitePendiente } }],
        },
      });
      if (enCurso > 0) {
        throw new ErrorApi(409, 'RECARGA_EN_CURSO', 'Tienes una recarga en proceso. Espera a que termine para eliminar tu cuenta.');
      }

      const hashInservible = await argon2.hash(randomBytes(32).toString('hex'), { type: argon2.argon2id });
      const resumen = await prisma.$transaction(async (tx) => {
        // Las pendientes abandonadas se cierran: sin número completo ya no se podrían acreditar
        await tx.recarga.updateMany({
          where: { usuarioId, estado: 'PENDIENTE', iniciadaEn: { lt: limitePendiente } },
          data: { estado: 'ERROR', motivo: 'La cuenta se eliminó antes de confirmar el pago.' },
        });
        // Las recargas se conservan, pero solo con los últimos 4 dígitos del número de destino
        const recargas = await tx.recarga.findMany({ where: { usuarioId }, select: { id: true, numeroDestino: true } });
        for (const r of recargas) {
          if (!r.numeroDestino.startsWith('••••')) {
            await tx.recarga.update({ where: { id: r.id }, data: { numeroDestino: `••••${r.numeroDestino.slice(-4)}` } });
          }
        }
        // Al borrar las tarjetas, sus alertas se borran en cascada y las recargas quedan sin tarjeta (tarjeta_id nulo)
        const tarjetas = await tx.tarjeta.deleteMany({ where: { usuarioId } });
        await tx.notificacion.deleteMany({ where: { usuarioId } });
        await tx.dispositivo.deleteMany({ where: { usuarioId } });
        await tx.tokenRecuperacion.deleteMany({ where: { usuarioId } });
        await tx.sesion.updateMany({ where: { usuarioId, revocadaEn: null }, data: { revocadaEn: ahora() } });
        await tx.usuario.update({
          where: { id: usuarioId },
          data: {
            nombre: 'Cuenta eliminada',
            // Dominio reservado .invalid (RFC 2606): libera el correo para un registro nuevo
            correo: `eliminada-${usuarioId}@recargamio.invalid`,
            hashContrasena: hashInservible,
            intentosFallidos: 0,
            bloqueadoHasta: null,
            eliminadoEn: ahora(),
          },
        });
        const resumen = { tarjetas: tarjetas.count, recargasAnonimizadas: recargas.length };
        await registrarAuditoria(tx, 'CUENTA_ELIMINADA', usuarioId, { ...resumen, ip: ip ?? null });
        return resumen;
      });

      avisar(usuario.correo, 'Eliminamos tu cuenta de RecargaMIO', [
        `Hola, ${usuario.nombre}.`,
        '',
        'Tu cuenta de RecargaMIO fue eliminada. Borramos tus tarjetas, alertas y notificaciones, y ya no puedes ingresar.',
        'Conservamos, sin tu nombre ni tu correo, el registro de las recargas que hiciste, como lo exigen la conciliación de pagos y la atención de reclamos.',
        'Puedes volver a registrarte con este mismo correo cuando quieras.',
      ]);
      logger.info({ ...resumen }, 'Cuenta eliminada');
      return resumen;
    },
  };
}

export type ServicioMe = ReturnType<typeof crearServicioMe>;
