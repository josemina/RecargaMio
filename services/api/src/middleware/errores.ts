// Formato único de error: { error: { codigo, mensaje, ...datos } } (sección 6 del plan).
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

export class ErrorApi extends Error {
  constructor(
    public readonly estadoHttp: number,
    public readonly codigo: string,
    mensaje: string,
    /** Datos adicionales seguros para mostrar en la app (por ejemplo, intentosRestantes). */
    public readonly datos: Record<string, unknown> = {},
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'La ruta solicitada no existe.' } });
};

export const manejadorErrores: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ErrorApi) {
    res.status(err.estadoHttp).json({ error: { codigo: err.codigo, mensaje: err.message, ...err.datos } });
    return;
  }
  if (err instanceof ZodError) {
    const mensaje = err.issues.map((i) => i.message).join(' ');
    const campos = [...new Set(err.issues.map((i) => i.path.join('.')).filter(Boolean))];
    res.status(400).json({ error: { codigo: 'DATOS_INVALIDOS', mensaje, campos } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { codigo: 'DATOS_INVALIDOS', mensaje: 'El cuerpo no es un JSON válido.' } });
    return;
  }
  req.log?.error({ err }, 'Error no controlado');
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado. Intenta de nuevo.' } });
};
