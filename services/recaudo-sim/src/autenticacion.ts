// Autenticación entre la API y el recaudo: encabezado X-Api-Key comparado en tiempo constante.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { ErrorRecaudo } from './errores';

const resumen = (valor: string) => createHash('sha256').update(valor).digest();

export function exigirApiKey(apiKey: string): RequestHandler {
  const esperado = resumen(apiKey);
  return (req, _res, next) => {
    const recibido = req.header('x-api-key');
    if (!recibido || !timingSafeEqual(resumen(recibido), esperado)) {
      next(new ErrorRecaudo(401, 'NO_AUTORIZADO', 'Falta la llave X-Api-Key o no es válida.'));
      return;
    }
    next();
  };
}
