// Reglas de autenticación de HU-06 (ADR 0011).
import { Prisma, type PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import type { Logger } from 'pino';
import { registrarAuditoria } from '../../auditoria';
import type { Correo } from '../../integraciones/correo';
import { ErrorApi } from '../../middleware/errores';
import { DURACION_RECUPERACION_MS, DURACION_RENOVACION_MS, type ServicioTokens } from '../../seguridad/tokens';
import { VERSION_POLITICA_ACTUAL } from './politica';

export const MAX_INTENTOS = 5;
export const DURACION_BLOQUEO_MS = 15 * 60 * 1000;

export interface DependenciasAuth {
  prisma: PrismaClient;
  tokens: ServicioTokens;
  correo: Correo;
  logger: Logger;
  ahora: () => Date;
  apiUrlPublica: string;
}

export interface Contexto {
  ip?: string;
}

const credencialesInvalidas = (datos: Record<string, unknown> = {}) =>
  new ErrorApi(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', datos);

const sesionInvalida = () => new ErrorApi(401, 'SESION_INVALIDA', 'Tu sesión ya no es válida. Vuelve a ingresar.');

const hashear = (contrasena: string) => argon2.hash(contrasena, { type: argon2.argon2id });

export function crearServicioAuth({ prisma, tokens, correo, logger, ahora, apiUrlPublica }: DependenciasAuth) {
  // Hash de una contraseña inventada: si el correo no existe se verifica contra él,
  // para que la respuesta tarde lo mismo exista o no la cuenta.
  const hashFicticio = hashear('contrasena-que-nadie-usa-1');

  async function abrirSesion(bd: PrismaClient | Prisma.TransactionClient, usuarioId: string) {
    const tokenRenovacion = tokens.generarOpaco();
    const sesion = await bd.sesion.create({
      data: {
        usuarioId,
        hashToken: tokens.resumir(tokenRenovacion),
        creadaEn: ahora(),
        expiraEn: new Date(ahora().getTime() + DURACION_RENOVACION_MS),
      },
    });
    const acceso = tokens.firmarAcceso({ usuarioId, sesionId: sesion.id });
    return {
      tokenAcceso: acceso.token,
      accesoExpiraEn: acceso.expiraEn.toISOString(),
      tokenRenovacion,
      sesionExpiraEn: sesion.expiraEn.toISOString(),
    };
  }

  const perfil = (u: { id: string; nombre: string; correo: string }) => ({ id: u.id, nombre: u.nombre, correo: u.correo });

  return {
    /** HU-06 CA-1 y CA-2. */
    async registrar(datos: { nombre: string; correo: string; contrasena: string; aceptaPolitica?: unknown }, { ip }: Contexto) {
      if (datos.aceptaPolitica !== true) {
        throw new ErrorApi(
          400,
          'POLITICA_NO_ACEPTADA',
          'Para crear la cuenta debes autorizar el tratamiento de tus datos personales (Ley 1581 de 2012).',
        );
      }
      const hashContrasena = await hashear(datos.contrasena);
      try {
        return await prisma.$transaction(async (tx) => {
          const usuario = await tx.usuario.create({
            data: { nombre: datos.nombre, correo: datos.correo, hashContrasena, creadoEn: ahora() },
          });
          await tx.autorizacionDatos.create({
            data: { usuarioId: usuario.id, versionPolitica: VERSION_POLITICA_ACTUAL, aceptadoEn: ahora(), ip },
          });
          await registrarAuditoria(tx, 'REGISTRO', usuario.id, { versionPolitica: VERSION_POLITICA_ACTUAL, ip: ip ?? null });
          return { usuario: perfil(usuario), ...(await abrirSesion(tx, usuario.id)) };
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ErrorApi(409, 'CORREO_REGISTRADO', 'Ya existe una cuenta con ese correo. Ingresa o recupera tu contraseña.');
        }
        throw error;
      }
    },

    /** HU-06 CA-4: tras cinco intentos fallidos, el ingreso se bloquea 15 minutos. */
    async ingresar({ correo: email, contrasena }: { correo: string; contrasena: string }, { ip }: Contexto) {
      const usuario = await prisma.usuario.findFirst({ where: { correo: email, eliminadoEn: null } });

      if (!usuario) {
        await argon2.verify(await hashFicticio, contrasena);
        await registrarAuditoria(prisma, 'INGRESO_FALLIDO', null, { motivo: 'correo_no_registrado', ip: ip ?? null });
        throw credencialesInvalidas();
      }

      if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > ahora()) {
        throw new ErrorApi(
          423,
          'CUENTA_BLOQUEADA',
          'Por seguridad, el ingreso está bloqueado por 15 minutos después de 5 intentos fallidos. Intenta más tarde o recupera tu contraseña.',
          { desbloqueoEn: usuario.bloqueadoHasta.toISOString() },
        );
      }

      if (!(await argon2.verify(usuario.hashContrasena, contrasena))) {
        const actualizado = await prisma.usuario.update({
          where: { id: usuario.id },
          data: { intentosFallidos: { increment: 1 } },
        });
        await registrarAuditoria(prisma, 'INGRESO_FALLIDO', usuario.id, { intento: actualizado.intentosFallidos, ip: ip ?? null });

        if (actualizado.intentosFallidos >= MAX_INTENTOS) {
          const bloqueadoHasta = new Date(ahora().getTime() + DURACION_BLOQUEO_MS);
          await prisma.usuario.update({ where: { id: usuario.id }, data: { bloqueadoHasta, intentosFallidos: 0 } });
          await registrarAuditoria(prisma, 'CUENTA_BLOQUEADA', usuario.id, { hasta: bloqueadoHasta.toISOString(), ip: ip ?? null });
          throw new ErrorApi(
            423,
            'CUENTA_BLOQUEADA',
            'Por seguridad, el ingreso quedó bloqueado por 15 minutos después de 5 intentos fallidos. Intenta más tarde o recupera tu contraseña.',
            { desbloqueoEn: bloqueadoHasta.toISOString() },
          );
        }
        throw credencialesInvalidas({ intentosRestantes: MAX_INTENTOS - actualizado.intentosFallidos });
      }

      await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
      const sesion = await abrirSesion(prisma, usuario.id);
      await registrarAuditoria(prisma, 'INGRESO_EXITOSO', usuario.id, { ip: ip ?? null });
      return { usuario: perfil(usuario), ...sesion };
    },

    /** Rotación: el token usado queda revocado. Si se reutiliza uno revocado, se cierran todas las sesiones. */
    async renovar(tokenRenovacion: string, { ip }: Contexto) {
      const sesion = await prisma.sesion.findUnique({ where: { hashToken: tokens.resumir(tokenRenovacion) } });
      if (!sesion) throw sesionInvalida();

      if (sesion.revocadaEn) {
        await prisma.sesion.updateMany({ where: { usuarioId: sesion.usuarioId, revocadaEn: null }, data: { revocadaEn: ahora() } });
        await registrarAuditoria(prisma, 'REUSO_TOKEN_RENOVACION', sesion.usuarioId, { ip: ip ?? null });
        logger.warn({ usuarioId: sesion.usuarioId }, 'Reúso de token de renovación: se cerraron todas las sesiones');
        throw sesionInvalida();
      }
      // HU-06 CA-3: cuando la sesión vence, ya no se puede renovar.
      if (sesion.expiraEn <= ahora()) {
        throw new ErrorApi(401, 'SESION_EXPIRADA', 'Tu sesión expiró. Vuelve a ingresar.');
      }

      return prisma.$transaction(async (tx) => {
        const { count } = await tx.sesion.updateMany({ where: { id: sesion.id, revocadaEn: null }, data: { revocadaEn: ahora() } });
        if (count === 0) throw sesionInvalida(); // otra petición la renovó al mismo tiempo
        const nueva = await abrirSesion(tx, sesion.usuarioId);
        await registrarAuditoria(tx, 'SESION_RENOVADA', sesion.usuarioId, { ip: ip ?? null });
        return nueva;
      });
    },

    /** Cierra la sesión. Es idempotente: un token desconocido o ya revocado no produce error. */
    async salir(tokenRenovacion: string, { ip }: Contexto) {
      const sesion = await prisma.sesion.findUnique({ where: { hashToken: tokens.resumir(tokenRenovacion) } });
      if (!sesion || sesion.revocadaEn) return;
      await prisma.sesion.update({ where: { id: sesion.id }, data: { revocadaEn: ahora() } });
      await registrarAuditoria(prisma, 'SALIDA', sesion.usuarioId, { ip: ip ?? null });
    },

    /** HU-06 CA-5. La respuesta es la misma exista o no el correo. */
    async solicitarRecuperacion(email: string, { ip }: Contexto) {
      const usuario = await prisma.usuario.findFirst({ where: { correo: email, eliminadoEn: null } });
      if (!usuario) return;

      const token = tokens.generarOpaco();
      await prisma.$transaction([
        // Un enlace nuevo invalida los anteriores que no se hayan usado
        prisma.tokenRecuperacion.updateMany({ where: { usuarioId: usuario.id, usadoEn: null }, data: { usadoEn: ahora() } }),
        prisma.tokenRecuperacion.create({
          data: {
            usuarioId: usuario.id,
            hashToken: tokens.resumir(token),
            creadoEn: ahora(),
            expiraEn: new Date(ahora().getTime() + DURACION_RECUPERACION_MS),
          },
        }),
      ]);
      await registrarAuditoria(prisma, 'RECUPERACION_SOLICITADA', usuario.id, { ip: ip ?? null });

      const enlace = `${apiUrlPublica.replace(/\/$/, '')}/restablecer?token=${token}`;
      // No se espera el envío: así la respuesta tarda lo mismo exista o no la cuenta.
      correo
        .enviar({
          para: usuario.correo,
          asunto: 'Restablece tu contraseña de RecargaMIO',
          texto: [
            `Hola, ${usuario.nombre}.`,
            '',
            'Recibimos una solicitud para restablecer la contraseña de tu cuenta de RecargaMIO.',
            `Abre este enlace para crear una nueva. Es válido por 30 minutos y solo funciona una vez:`,
            enlace,
            '',
            'Si no lo pediste, ignora este correo: tu contraseña no cambiará.',
          ].join('\n'),
          html: `<p>Hola, ${escaparHtml(usuario.nombre)}.</p>
<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de RecargaMIO.</p>
<p><a href="${enlace}">Crear una nueva contraseña</a></p>
<p>El enlace es válido por <strong>30 minutos</strong> y solo funciona una vez.</p>
<p>Si no lo pediste, ignora este correo: tu contraseña no cambiará.</p>
<p style="color:#5B6475;font-size:12px">RecargaMIO · Prototipo académico UNAD · Pagos en modo de pruebas</p>`,
        })
        .catch((err) => logger.error({ err, usuarioId: usuario.id }, 'No se pudo enviar el correo de recuperación'));
    },

    /** Token de un solo uso y 30 minutos. Cambia la contraseña, quita el bloqueo y cierra todas las sesiones. */
    async restablecer({ token, contrasena }: { token: string; contrasena: string }, { ip }: Contexto) {
      const registro = await prisma.tokenRecuperacion.findUnique({ where: { hashToken: tokens.resumir(token) } });
      if (!registro || registro.usadoEn || registro.expiraEn <= ahora()) {
        throw new ErrorApi(400, 'ENLACE_INVALIDO', 'El enlace no es válido, ya se usó o venció. Solicita uno nuevo.');
      }
      const hashContrasena = await hashear(contrasena);
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.tokenRecuperacion.updateMany({
          where: { id: registro.id, usadoEn: null },
          data: { usadoEn: ahora() },
        });
        if (count === 0) throw new ErrorApi(400, 'ENLACE_INVALIDO', 'El enlace ya se usó. Solicita uno nuevo.');
        await tx.usuario.update({
          where: { id: registro.usuarioId },
          data: { hashContrasena, intentosFallidos: 0, bloqueadoHasta: null },
        });
        await tx.sesion.updateMany({ where: { usuarioId: registro.usuarioId, revocadaEn: null }, data: { revocadaEn: ahora() } });
        await registrarAuditoria(tx, 'CONTRASENA_RESTABLECIDA', registro.usuarioId, { ip: ip ?? null });
      });
    },
  };
}

export function escaparHtml(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export type ServicioAuth = ReturnType<typeof crearServicioAuth>;
