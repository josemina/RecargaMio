// Límite de peticiones por IP (MASVS-RESILIENCE). Frena ataques de fuerza bruta y de enumeración de correos.
import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

const QUINCE_MINUTOS = 15 * 60 * 1000;

function limite(limite: number, ventanaMs: number): RequestHandler {
  return rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Hiciste demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.' },
      });
    },
  });
}

const sinLimite: RequestHandler = (_req, _res, next) => next();

export function crearLimites(activos: boolean) {
  return {
    ingreso: activos ? limite(10, QUINCE_MINUTOS) : sinLimite,
    registro: activos ? limite(10, 60 * 60 * 1000) : sinLimite,
    recuperacion: activos ? limite(5, QUINCE_MINUTOS) : sinLimite,
    general: activos ? limite(300, QUINCE_MINUTOS) : sinLimite,
  };
}
