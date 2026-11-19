// Tokens de la autenticación (ADR 0011).
// - Acceso: JWT HS256 de 15 minutos con el id del usuario (sub) y de la sesión (sid).
// - Renovación y recuperación: 32 bytes aleatorios; en la base solo se guarda su HMAC-SHA256.
import { createHmac, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ErrorApi } from '../middleware/errores';

export const DURACION_ACCESO_S = 15 * 60;
export const DURACION_RENOVACION_MS = 7 * 24 * 60 * 60 * 1000;
export const DURACION_RECUPERACION_MS = 30 * 60 * 1000;

export interface ContenidoAcceso {
  usuarioId: string;
  sesionId: string;
}

export function crearServicioTokens(secretoAcceso: string, secretoRenovacion: string, ahora: () => Date) {
  const segundos = () => Math.floor(ahora().getTime() / 1000);

  return {
    firmarAcceso({ usuarioId, sesionId }: ContenidoAcceso): { token: string; expiraEn: Date } {
      const iat = segundos();
      const token = jwt.sign({ sid: sesionId, iat }, secretoAcceso, {
        algorithm: 'HS256',
        subject: usuarioId,
        expiresIn: DURACION_ACCESO_S,
      });
      return { token, expiraEn: new Date((iat + DURACION_ACCESO_S) * 1000) };
    },

    verificarAcceso(token: string): ContenidoAcceso {
      try {
        const datos = jwt.verify(token, secretoAcceso, { algorithms: ['HS256'], clockTimestamp: segundos() });
        if (typeof datos === 'string' || !datos.sub || typeof datos.sid !== 'string') throw new Error('contenido');
        return { usuarioId: datos.sub, sesionId: datos.sid };
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new ErrorApi(401, 'TOKEN_EXPIRADO', 'Tu sesión expiró. Vuelve a ingresar.');
        }
        throw new ErrorApi(401, 'TOKEN_INVALIDO', 'El token de acceso no es válido.');
      }
    },

    /** Token opaco para renovación o recuperación. */
    generarOpaco: () => randomBytes(32).toString('base64url'),

    /** HMAC del token opaco: es lo único que se guarda en la base. */
    resumir: (token: string) => createHmac('sha256', secretoRenovacion).update(token).digest('hex'),
  };
}

export type ServicioTokens = ReturnType<typeof crearServicioTokens>;
