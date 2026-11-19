// Exige Authorization: Bearer <token de acceso>.
// Además del JWT, verifica que la sesión siga abierta: así cerrar sesión o restablecer la contraseña
// invalida de inmediato los tokens de acceso emitidos antes (HU-06 CA-3).
import type { PrismaClient } from '@prisma/client';
import type { Request, RequestHandler } from 'express';
import type { ServicioTokens } from '../seguridad/tokens';
import { ErrorApi } from './errores';

export interface UsuarioAutenticado {
  usuarioId: string;
  sesionId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    usuario?: UsuarioAutenticado;
  }
}

export function crearAutenticar(prisma: PrismaClient, tokens: ServicioTokens, ahora: () => Date): RequestHandler {
  return async (req, _res, next) => {
    const [esquema, token] = (req.header('authorization') ?? '').split(' ');
    if (esquema !== 'Bearer' || !token) {
      throw new ErrorApi(401, 'NO_AUTENTICADO', 'Debes ingresar para continuar.');
    }
    const { usuarioId, sesionId } = tokens.verificarAcceso(token);
    const sesion = await prisma.sesion.findUnique({ where: { id: sesionId }, include: { usuario: true } });
    if (!sesion || sesion.usuarioId !== usuarioId || sesion.revocadaEn || sesion.expiraEn <= ahora() || sesion.usuario.eliminadoEn) {
      throw new ErrorApi(401, 'SESION_INVALIDA', 'Tu sesión ya no es válida. Vuelve a ingresar.');
    }
    req.usuario = { usuarioId, sesionId };
    next();
  };
}

/** Devuelve el usuario autenticado o falla si la ruta no pasó por `autenticar`. */
export function usuarioDe(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw new ErrorApi(401, 'NO_AUTENTICADO', 'Debes ingresar para continuar.');
  return req.usuario;
}
